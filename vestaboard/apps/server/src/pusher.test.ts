import { afterEach, describe, expect, it, vi } from 'vitest';
import { blankGrid, BoardConfig, Game, Grid } from '@vestaboard/core';
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
  getNewsDigest: async () => [],
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

  it('interleaves a pinned slide after every regular slide', async () => {
    const g = (code: number) => {
      const grid = blankGrid();
      grid[0]![0] = code;
      return grid;
    };
    const cfg: BoardConfig = {
      rotation: { frequencySeconds: 30 },
      slides: [
        { id: 'r1', name: 'R1', enabled: true, order: 1, config: { type: 'painter', grid: g(1) } },
        { id: 'p', name: 'P', enabled: true, order: 2, pinned: true, config: { type: 'painter', grid: g(2) } },
        { id: 'r2', name: 'R2', enabled: true, order: 3, config: { type: 'painter', grid: g(3) } },
      ],
    };
    const h = harness(cfg);
    for (let i = 0; i < 5; i++) {
      await h.pusher.tick();
      h.advance(30_000);
    }
    // regulars [R1,R2] + pin [P] → 1,2,3,2,1 (P after each regular)
    expect(h.pushes.map((grid) => grid[0]![0])).toEqual([1, 2, 3, 2, 1]);
  });

  it('holds a pause pattern (with BRB) and skips re-pushes', async () => {
    const cfg = painter(5);
    // harness clock starts at 1,000,000 ms — pause until well past that
    cfg.pause = { until: new Date(2_000_000).toISOString(), patternId: 'checkerboard', brb: true };
    const h = harness(cfg);
    await h.pusher.tick();
    h.advance(30_000);
    await h.pusher.tick();
    expect(h.pushes).toHaveLength(1); // identical grid skipped on the 2nd tick
    expect(h.logs.some((l) => l.includes('paused (checkerboard)'))).toBe(true);
    // BRB label present in the pushed grid
    const grid = h.pushes[0]!;
    expect(grid[2]!.some((c) => c === 2)).toBe(true); // 'B' = 2
    // pause expires → rotation resumes
    h.advance(1_500_000);
    await h.pusher.tick();
    expect(h.pushes.length).toBeGreaterThan(1);
  });

  it('sports mode rotates only sports slides', async () => {
    const cfg = painter(5);
    cfg.sportsMode = true;
    cfg.slides.push({
      id: 's',
      name: 'Scores',
      enabled: true,
      order: 3,
      config: { type: 'sports', league: 'nhl' },
    });
    const h = harness(cfg);
    for (let i = 0; i < 3; i++) {
      await h.pusher.tick();
      h.advance(30_000);
    }
    // every push was the sports slide ("NO GAMES TODAY" text, no painter codes)
    expect(h.logs.filter((l) => l.includes('pushed')).every((l) => l.includes('Scores'))).toBe(true);
    expect(h.pushes.length).toBeGreaterThanOrEqual(1);
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

  it('blanks the board during sleep hours', async () => {
    const cfg = painter(5);
    cfg.timeZone = 'UTC'; // harness now() = 00:16:40 UTC
    cfg.sleep = { start: '00:00', end: '06:00' };
    const h = harness(cfg);
    await h.pusher.tick();
    expect(h.pushes).toHaveLength(1);
    expect(h.pushes[0]!.every((row) => row.every((c) => c === 0))).toBe(true);
    expect(h.logs.some((l) => l.includes('asleep'))).toBe(true);
  });

  it('skips slides outside their schedule', async () => {
    const cfg = painter(5);
    cfg.timeZone = 'UTC';
    cfg.slides.forEach((s) => (s.schedule = { start: '09:00', end: '10:00' }));
    const h = harness(cfg);
    await h.pusher.tick();
    expect(h.pushes).toHaveLength(0);
    expect(h.logs.some((l) => l.includes('no active slides'))).toBe(true);
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

  it('interrupts the rotation when a tracked score changes, then resumes one slide on', async () => {
    const grid = (code: number) =>
      blankGrid('flagship').map((r, i) => (i === 0 ? [code, ...r.slice(1)] : r));
    const config: BoardConfig = {
      rotation: { frequencySeconds: 30 },
      slides: [
        { id: 'a', name: 'A', enabled: true, order: 1, config: { type: 'painter', grid: grid(10) } },
        { id: 'b', name: 'B', enabled: true, order: 2, config: { type: 'painter', grid: grid(11) } },
        { id: 'c', name: 'C', enabled: true, order: 3, config: { type: 'painter', grid: grid(12) } },
        { id: 'scores', name: 'Scores', enabled: true, order: 4, config: { type: 'sports', league: 'nhl', teams: ['TOR'] } },
      ],
    };
    let scores: Game[] = [
      { league: 'nhl', away: { abbrev: 'TOR', score: 0 }, home: { abbrev: 'BOS', score: 0 }, state: 'live', statusText: 'P1' },
    ];
    let ms = 1_000_000;
    const pushed: string[] = [];
    const deps: PusherDeps = {
      getConfig: () => config,
      sources: { ...emptySources, getScores: async () => scores },
      getClient: () => ({ postMessage: async () => {} }),
      now: () => new Date(ms),
      log: (m) => {
        const hit = /^pushed "(.+)"$/.exec(m);
        if (hit) pushed.push(hit[1]!);
      },
    };
    const pusher = new BoardPusher(deps);

    await pusher.tick(); // A (records baseline 0-0, no interrupt on first sight)
    ms += 30_000;
    await pusher.tick(); // B
    expect(pushed).toEqual(['A', 'B']);

    // A goal for the tracked team, then enough time for the next score poll.
    scores = [
      { league: 'nhl', away: { abbrev: 'TOR', score: 1 }, home: { abbrev: 'BOS', score: 0 }, state: 'live', statusText: 'P1' },
    ];
    ms += 30_000;
    await pusher.tick(); // score change → Scores overtakes the board out of turn
    expect(pushed[pushed.length - 1]).toBe('Scores (score update)');

    // After the hold, rotation resumes one slide past B → C (not back to A).
    ms += 30_000;
    await pusher.tick();
    expect(pushed[pushed.length - 1]).toBe('C');
  });

  it('does not interrupt on the first score poll (no baseline yet)', async () => {
    const config: BoardConfig = {
      rotation: { frequencySeconds: 30 },
      slides: [
        { id: 'scores', name: 'Scores', enabled: true, order: 1, config: { type: 'sports', league: 'nhl', teams: ['TOR'] } },
        { id: 'a', name: 'A', enabled: true, order: 2, config: { type: 'painter', grid: blankGrid() } },
      ],
    };
    const scores: Game[] = [
      { league: 'nhl', away: { abbrev: 'TOR', score: 2 }, home: { abbrev: 'BOS', score: 1 }, state: 'live', statusText: 'P2' },
    ];
    const labels: string[] = [];
    let ms = 1_000_000;
    const pusher = new BoardPusher({
      getConfig: () => config,
      sources: { ...emptySources, getScores: async () => scores },
      getClient: () => ({ postMessage: async () => {} }),
      now: () => new Date(ms),
      log: (m) => {
        const hit = /^pushed "(.+)"$/.exec(m);
        if (hit) labels.push(hit[1]!);
      },
    });
    await pusher.tick();
    ms += 30_000;
    await pusher.tick();
    expect(labels.some((l) => l.includes('score update'))).toBe(false);
  });
});
