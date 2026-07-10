import { describe, expect, it } from 'vitest';
import { BoardConfig, blankGrid, Grid, MIN_FREQUENCY_SECONDS } from '@vestaboard/core';
import { RateLimitedError } from './board.js';
import { RotationEngine, RotationDeps } from './rotation.js';

function makeConfig(overrides: Partial<BoardConfig> = {}): BoardConfig {
  return {
    rotation: { frequencySeconds: 30 },
    slides: [
      {
        id: 'a',
        name: 'painter A',
        enabled: true,
        order: 1,
        config: { type: 'painter', grid: gridWith(1) },
      },
      {
        id: 'b',
        name: 'painter B',
        enabled: true,
        order: 2,
        config: { type: 'painter', grid: gridWith(2) },
      },
      {
        id: 'off',
        name: 'disabled',
        enabled: false,
        order: 0,
        config: { type: 'painter', grid: gridWith(3) },
      },
    ],
    ...overrides,
  };
}

function gridWith(code: number): Grid {
  const grid = blankGrid();
  grid[0]![0] = code;
  return grid;
}

interface Harness {
  engine: RotationEngine;
  pushes: Array<{ grid: Grid; transition?: string }>;
  logs: string[];
  clock: { ms: number };
  advance(ms: number): void;
}

function makeHarness(
  config: BoardConfig,
  pushImpl?: RotationDeps['push'],
): Harness {
  const pushes: Harness['pushes'] = [];
  const logs: string[] = [];
  const clock = { ms: 1_000_000 };
  const deps: RotationDeps = {
    getConfig: async () => config,
    getContext: async (_slide, now) => ({ now }),
    push:
      pushImpl ??
      (async (grid, transition) => {
        pushes.push({ grid, transition });
      }),
    now: () => new Date(clock.ms),
    log: (m) => logs.push(m),
  };
  return {
    engine: new RotationEngine(deps),
    pushes,
    logs,
    clock,
    advance: (ms) => (clock.ms += ms),
  };
}

describe('RotationEngine', () => {
  it('cycles enabled slides in order, skipping disabled ones', async () => {
    const h = makeHarness(makeConfig());
    await h.engine.tick();
    h.advance(30_000);
    await h.engine.tick();
    h.advance(30_000);
    await h.engine.tick();
    expect(h.pushes.map((p) => p.grid[0]![0])).toEqual([1, 2, 1]);
  });

  it('does not advance before frequencySeconds elapses', async () => {
    const h = makeHarness(makeConfig());
    await h.engine.tick();
    h.advance(10_000);
    await h.engine.tick(); // same slide, same grid -> skipped push
    expect(h.pushes).toHaveLength(1);
    expect(h.logs.some((l) => l.includes('skip'))).toBe(true);
  });

  it('clamps the tick delay to the 15s hardware floor', async () => {
    const config = makeConfig({ rotation: { frequencySeconds: 1 } });
    const h = makeHarness(config);
    const delay = await h.engine.tick();
    expect(delay).toBeGreaterThanOrEqual(MIN_FREQUENCY_SECONDS * 1000);
  });

  it('wakes at most every 60s so clocks stay current', async () => {
    const config = makeConfig({ rotation: { frequencySeconds: 600 } });
    const h = makeHarness(config);
    const delay = await h.engine.tick();
    expect(delay).toBe(60_000);
  });

  it('retries after a rate-limited push without dying', async () => {
    let calls = 0;
    const h = makeHarness(makeConfig(), async () => {
      calls++;
      if (calls === 1) throw new RateLimitedError();
    });
    await h.engine.tick();
    expect(h.logs.some((l) => l.includes('rate limited'))).toBe(true);
    h.advance(30_000);
    await h.engine.tick();
    expect(calls).toBe(2);
  });

  it('keeps the last good config when refresh fails', async () => {
    let failNext = false;
    const config = makeConfig();
    const deps: RotationDeps = {
      getConfig: async () => {
        if (failNext) throw new Error('down');
        return config;
      },
      getContext: async (_slide, now) => ({ now }),
      push: async () => {},
      now: () => new Date(clockMs),
      log: () => {},
    };
    let clockMs = 0;
    const engine = new RotationEngine(deps, { configRefreshSeconds: 1 });
    await engine.tick();
    failNext = true;
    clockMs += 120_000;
    await expect(engine.tick()).resolves.toBeGreaterThan(0);
  });

  it('passes the slide transition through to the push', async () => {
    const config = makeConfig();
    config.slides[0]!.transition = 'edges-to-center';
    const h = makeHarness(config);
    await h.engine.tick();
    expect(h.pushes[0]?.transition).toBe('edges-to-center');
  });
});
