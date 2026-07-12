import { afterEach, describe, expect, it, vi } from 'vitest';
import { blankGrid, BoardConfig, Grid } from '@vestaboard/core';
import { RateLimitedError, VestaboardCloudClient } from './vestaboard.js';
import { BoardPusher, PusherDeps } from './pusher.js';
import { DataSources } from './sources.js';

afterEach(() => vi.restoreAllMocks());

const emptySources: DataSources = {
  getQuotes: async () => [],
  getWeather: async () => ({
    temperature: 0,
    weatherCode: 0,
    high: 0,
    low: 0,
    daily: [],
  }),
  getNews: async () => [],
  getScores: async () => [],
};

function painter(code: number): BoardConfig {
  const grid = blankGrid();
  grid[0]![0] = code;
  return {
    rotation: { frequencySeconds: 30 },
    slides: [
      { id: 'a', name: 'A', enabled: true, order: 1, config: { type: 'painter', grid } },
      {
        id: 'b',
        name: 'B',
        enabled: true,
        order: 2,
        config: { type: 'painter', grid: blankGrid('flagship').map((r, i) => (i === 0 ? [code + 1, ...r.slice(1)] : r)) },
      },
    ],
  };
}

describe('VestaboardCloudClient', () => {
  it('POSTs the grid wrapped in { characters } with the token header', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
    const client = new VestaboardCloudClient({ token: 'tok123' });
    await client.postMessage(blankGrid());
    const [url, init] = spy.mock.calls[0]!;
    expect(url).toBe('https://cloud.vestaboard.com/');
    expect((init!.headers as Record<string, string>)['X-Vestaboard-Token']).toBe('tok123');
    expect(JSON.parse(init!.body as string)).toHaveProperty('characters');
  });

  it('throws RateLimitedError on 429', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 429 }));
    const client = new VestaboardCloudClient({ token: 't' });
    await expect(client.postMessage(blankGrid())).rejects.toBeInstanceOf(RateLimitedError);
  });

  it('honors a custom endpoint and header', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
    const client = new VestaboardCloudClient({
      token: 'k',
      url: 'https://rw.vestaboard.com/',
      header: 'X-Vestaboard-Read-Write-Key',
    });
    await client.postMessage(blankGrid());
    const [url, init] = spy.mock.calls[0]!;
    expect(url).toBe('https://rw.vestaboard.com/');
    expect((init!.headers as Record<string, string>)['X-Vestaboard-Read-Write-Key']).toBe('k');
  });
});

describe('BoardPusher', () => {
  function harness(config: BoardConfig) {
    const pushes: Grid[] = [];
    const logs: string[] = [];
    let ms = 1_000_000;
    const deps: PusherDeps = {
      getConfig: () => config,
      sources: emptySources,
      getClient: () => ({ postMessage: async (g) => void pushes.push(g) }),
      now: () => new Date(ms),
      log: (m) => logs.push(m),
    };
    return {
      pusher: new BoardPusher(deps),
      pushes,
      logs,
      advance: (d: number) => (ms += d),
    };
  }

  it('cycles enabled slides and skips identical grids', async () => {
    const h = harness(painter(5));
    await h.pusher.tick();
    h.advance(30_000);
    await h.pusher.tick();
    h.advance(30_000);
    await h.pusher.tick();
    expect(h.pushes.map((g) => g[0]![0])).toEqual([5, 6, 5]);
    // same slide within the interval → skipped
    await h.pusher.tick();
    expect(h.pushes).toHaveLength(3);
    expect(h.logs.some((l) => l.includes('skip'))).toBe(true);
  });

  it('clamps the tick delay to the 15s hardware floor', async () => {
    const cfg = painter(1);
    cfg.rotation.frequencySeconds = 1;
    const h = harness(cfg);
    const d = await h.pusher.tick();
    expect(d).toBeGreaterThanOrEqual(15_000);
  });

  it('idles without pushing when no key is configured', async () => {
    const pushes: Grid[] = [];
    let hasKey = false;
    const statuses: boolean[] = [];
    const pusher = new BoardPusher({
      getConfig: () => painter(3),
      sources: emptySources,
      getClient: () => (hasKey ? { postMessage: async (g) => void pushes.push(g) } : null),
      now: () => new Date(1_000_000),
      log: () => {},
      onStatus: (s) => statuses.push(s.pushEnabled),
    });
    await pusher.tick();
    expect(pushes).toHaveLength(0);
    expect(pusher.getStatus().pushEnabled).toBe(false);
    // once a key appears, it starts pushing
    hasKey = true;
    await pusher.tick();
    expect(pushes.length).toBeGreaterThan(0);
    expect(pusher.getStatus().pushEnabled).toBe(true);
    expect(statuses).toContain(false);
    expect(statuses).toContain(true);
  });

  it('survives a rate-limited push', async () => {
    const config = painter(9);
    let calls = 0;
    const deps: PusherDeps = {
      getConfig: () => config,
      sources: emptySources,
      getClient: () => ({
        postMessage: async () => {
          calls++;
          if (calls === 1) throw new RateLimitedError();
        },
      }),
      now: () => new Date(1000),
      log: () => {},
    };
    const pusher = new BoardPusher(deps);
    await expect(pusher.tick()).resolves.toBeGreaterThan(0);
    expect(calls).toBe(1);
  });
});
