import { describe, expect, it } from 'vitest';
import { toAscii } from '../grid.js';
import type { Game } from '../types.js';
import { renderSports } from './sports.js';

const games: Game[] = [
  {
    league: 'nhl',
    away: { abbrev: 'TOR', score: 4 },
    home: { abbrev: 'BOS', score: 2 },
    state: 'live',
    statusText: 'P2 8:44',
  },
  {
    league: 'nhl',
    away: { abbrev: 'MTL', score: 1 },
    home: { abbrev: 'NYR', score: 5 },
    state: 'final',
    statusText: 'FINAL',
  },
  {
    league: 'nhl',
    away: { abbrev: 'VAN', score: 0 },
    home: { abbrev: 'EDM', score: 0 },
    state: 'pre',
    statusText: '7:30 PM',
  },
  {
    league: 'nba',
    away: { abbrev: 'LAL', score: 99 },
    home: { abbrev: 'BOS', score: 101 },
    state: 'final',
    statusText: 'FINAL',
  },
];

describe('renderSports', () => {
  it('renders league games with state chips and statuses', () => {
    const grid = renderSports({ type: 'sports', league: 'nhl' }, games);
    expect(toAscii(grid)).toMatchInlineSnapshot(`
      "+----------------------+
      |         NHL          |
      |G TOR 4 BOS 2  P2 8:44|
      |Y VAN @ EDM    7:30 PM|
      |W MTL 1 NYR 5    FINAL|
      |                      |
      |                      |
      +----------------------+"
    `);
  });

  it('pins configured teams first', () => {
    const grid = renderSports({ type: 'sports', league: 'nhl', teams: ['MTL'] }, games);
    const ascii = toAscii(grid);
    expect(ascii.indexOf('MTL')).toBeLessThan(ascii.indexOf('TOR'));
  });

  it('filters to the configured league', () => {
    const grid = renderSports({ type: 'sports', league: 'nba' }, games);
    const ascii = toAscii(grid);
    expect(ascii).toContain('LAL');
    expect(ascii).not.toContain('TOR');
  });

  it('shows a message when no games', () => {
    const grid = renderSports({ type: 'sports', league: 'mlb' }, games);
    expect(toAscii(grid)).toContain('NO GAMES TODAY');
  });

  it('onlyPinned shows just the picked teams’ games', () => {
    const grid = renderSports(
      { type: 'sports', league: 'nhl', teams: ['MTL'], onlyPinned: true },
      games,
    );
    const ascii = toAscii(grid);
    expect(ascii).toContain('MTL');
    expect(ascii).not.toContain('TOR'); // TOR/BOS game filtered out
    expect(ascii).not.toContain('VAN');
  });

  it('onlyPinned with no matching games explains why', () => {
    const grid = renderSports(
      { type: 'sports', league: 'nhl', teams: ['ZZZ'], onlyPinned: true },
      games,
    );
    expect(toAscii(grid)).toContain('NO TEAM GAMES');
  });
});
