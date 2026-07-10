import { BLANK, COLOR } from '../chars.js';
import { blankGrid, COLS, Grid, ROWS } from '../grid.js';
import { encodeLine, writeAt } from '../text.js';
import type { Game, SportsSlideConfig } from '../types.js';


const STATE_CHIP: Record<Game['state'], number> = {
  live: COLOR.green,
  final: COLOR.white,
  pre: COLOR.yellow,
};

/**
 * One game per row, away @ home, status right-aligned:
 *
 *          NHL
 *   G TOR 4 BOS 2  P2 8:44
 *   W MTL 1 NYR 5    FINAL
 *   Y VAN @ EDM  7:30 PM
 */
function gameRow(game: Game): number[] {
  const row = Array<number>(COLS).fill(BLANK);
  row[0] = STATE_CHIP[game.state];
  const away = game.away.abbrev.slice(0, 3);
  const home = game.home.abbrev.slice(0, 3);
  if (game.state === 'pre') {
    writeAt(row, 2, `${away} @ ${home}`);
  } else {
    writeAt(row, 2, `${away} ${game.away.score} ${home} ${game.home.score}`);
  }
  const status = game.statusText.slice(0, 8);
  writeAt(row, COLS - status.length, status);
  return row;
}

export function renderSports(config: SportsSlideConfig, games?: Game[]): Grid {
  const grid = blankGrid();
  grid[0] = encodeLine(config.league.toUpperCase(), 'center');
  const forLeague = (games ?? []).filter((g) => g.league === config.league);
  if (forLeague.length === 0) {
    grid[2] = encodeLine('NO GAMES TODAY', 'center');
    return grid;
  }
  const pinned = (config.teams ?? []).map((t) => t.toUpperCase());
  const rank = (g: Game) => {
    const hasPin =
      pinned.includes(g.home.abbrev.toUpperCase()) ||
      pinned.includes(g.away.abbrev.toUpperCase());
    const stateRank = g.state === 'live' ? 0 : g.state === 'pre' ? 1 : 2;
    return (hasPin ? 0 : 10) + stateRank;
  };
  const ordered = [...forLeague].sort((a, b) => rank(a) - rank(b));
  ordered.slice(0, ROWS - 1).forEach((game, i) => {
    grid[i + 1] = gameRow(game);
  });
  return grid;
}
