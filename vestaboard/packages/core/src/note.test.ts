import { describe, expect, it } from 'vitest';
import { blankGrid, gridModelOf, gridsEqual, isGrid, toAscii } from './grid.js';
import { parseBoardConfig } from './schema.js';
import { render } from './render.js';
import type { Quote, WeatherData, Game } from './types.js';

const at = new Date('2026-07-10T14:35:00Z');
const noteCtx = { now: at, model: 'note' as const };

describe('grid model helpers', () => {
  it('identifies both board shapes', () => {
    expect(gridModelOf(blankGrid('flagship'))).toBe('flagship');
    expect(gridModelOf(blankGrid('note'))).toBe('note');
    expect(gridModelOf([[1, 2, 3]])).toBeNull();
    expect(isGrid(blankGrid('note'), 'note')).toBe(true);
    expect(isGrid(blankGrid('note'), 'flagship')).toBe(false);
  });

  it('treats different shapes as unequal', () => {
    expect(gridsEqual(blankGrid('flagship'), blankGrid('note'))).toBe(false);
  });
});

describe('renderers on the Note (3x15)', () => {
  it('word clock fits three rows', () => {
    const grid = render(
      { type: 'clock', style: 'word', timeZone: 'UTC' },
      noteCtx,
    );
    expect(toAscii(grid)).toMatchInlineSnapshot(`
      "+---------------+
      | IT IS TWENTY  |
      | FIVE TO THREE |
      |               |
      +---------------+"
    `);
  });

  it('big-digital falls back to centered text', () => {
    const grid = render(
      { type: 'clock', style: 'big-digital', timeZone: 'UTC' },
      noteCtx,
    );
    expect(toAscii(grid)).toContain('2:35 PM');
    expect(grid).toHaveLength(3);
  });

  it('digital-date uses all three rows', () => {
    const grid = render(
      { type: 'clock', style: 'digital-date', timeZone: 'UTC' },
      noteCtx,
    );
    expect(toAscii(grid)).toMatchInlineSnapshot(`
      "+---------------+
      |    2:35 PM    |
      |      FRI      |
      |  JUL 10 2026  |
      +---------------+"
    `);
  });

  it('ticker drops the title and percent column', () => {
    const quotes: Quote[] = [
      { symbol: 'BTC/CAD', market: 'crypto', price: 91234.12, changePercent: 2.3, currency: 'CAD' },
      { symbol: 'SHOP', market: 'tmx', price: 145.3, changePercent: -0.2, currency: 'CAD' },
    ];
    const grid = render(
      {
        type: 'ticker',
        title: 'MARKETS',
        symbols: [
          { symbol: 'BTC/CAD', market: 'crypto' },
          { symbol: 'SHOP', market: 'tmx' },
        ],
      },
      { ...noteCtx, quotes },
    );
    expect(toAscii(grid)).toMatchInlineSnapshot(`
      "+---------------+
      |G BTC    91.23K|
      |R SHOP    145.3|
      |               |
      +---------------+"
    `);
  });

  it('weather shows the summary only', () => {
    const weather: WeatherData = {
      temperature: 21.4,
      weatherCode: 61,
      high: 24,
      low: 16,
      precipitationChance: 80,
      daily: [{ date: '2026-07-11', high: 24, low: 16, weatherCode: 3 }],
    };
    const grid = render(
      { type: 'weather', locationName: 'Toronto', latitude: 43.65, longitude: -79.38 },
      { ...noteCtx, weather },
    );
    expect(toAscii(grid)).toMatchInlineSnapshot(`
      "+---------------+
      |B TORONTO   21°|
      |RAIN           |
      |H 24° L 16°    |
      +---------------+"
    `);
  });

  it('sports skips the league row and status column', () => {
    const games: Game[] = [
      {
        league: 'nhl',
        away: { abbrev: 'TOR', score: 4 },
        home: { abbrev: 'BOS', score: 2 },
        state: 'live',
        statusText: 'P2 8:44',
      },
    ];
    const grid = render({ type: 'sports', league: 'nhl' }, { ...noteCtx, games });
    expect(toAscii(grid)).toMatchInlineSnapshot(`
      "+---------------+
      |G TOR 4 BOS 2  |
      |               |
      |               |
      +---------------+"
    `);
  });

  it('painter blanks a grid painted for the other model', () => {
    const flagshipArt = blankGrid('flagship');
    flagshipArt[0]![0] = 63;
    const onNote = render({ type: 'painter', grid: flagshipArt }, noteCtx);
    expect(onNote).toEqual(blankGrid('note'));
    const noteArt = blankGrid('note');
    noteArt[0]![0] = 63;
    expect(render({ type: 'painter', grid: noteArt }, noteCtx)).toEqual(noteArt);
  });
});

describe('schema with boardModel', () => {
  it('accepts note configs and note painter grids', () => {
    const config = parseBoardConfig({
      boardModel: 'note',
      rotation: { frequencySeconds: 30 },
      slides: [
        {
          id: 'p',
          name: 'Art',
          enabled: true,
          order: 1,
          config: { type: 'painter', grid: blankGrid('note') },
        },
      ],
    });
    expect(config.boardModel).toBe('note');
  });

  it('rejects malformed grids', () => {
    expect(() =>
      parseBoardConfig({
        rotation: { frequencySeconds: 30 },
        slides: [
          {
            id: 'p',
            name: 'Art',
            enabled: true,
            order: 1,
            config: { type: 'painter', grid: [[1, 2], [3]] },
          },
        ],
      }),
    ).toThrow();
  });
});
