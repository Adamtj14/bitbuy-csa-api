import { BLANK, COLOR } from '../chars.js';
import { blankGrid, BoardModel, dimsOf, Grid } from '../grid.js';
import { encodeLine, writeAt } from '../text.js';
import type { Game, SportsSlideConfig } from '../types.js';

const STATE_CHIP: Record<Game['state'], number> = {
  live: COLOR.green,
  final: COLOR.white,
  pre: COLOR.yellow,
};

/**
 * One game per row, away @ home. The flagship right-aligns a status
 * column; the Note relies on the state chip (green live, white final,
 * yellow upcoming) and skips the league title row.
 *
 *          NHL
 *   G TOR 4 BOS 2  P2 8:44
 *   W MTL 1 NYR 5    FINAL
 *   Y VAN @ EDM    7:30 PM
 */
function gameRow(game: Game, cols: number): number[] {
  const row = Array<number>(cols).fill(BLANK);
  row[0] = STATE_CHIP[game.state];
  const away = game.away.abbrev.slice(0, 3);
  const home = game.home.abbrev.slice(0, 3);
  if (game.state === 'pre') {
    writeAt(row, 2, `${away} @ ${home}`);
  } else {
    writeAt(row, 2, `${away} ${game.away.score} ${home} ${game.home.score}`);
  }
  if (cols >= 22) {
    const status = game.statusText.slice(0, 8);
    writeAt(row, cols - status.length, status);
  }
  return row;
}

export function renderSports(
  config: SportsSlideConfig,
  games?: Game[],
  model: BoardModel = 'flagship',
): Grid {
  const { rows, cols } = dimsOf(model);
  const grid = blankGrid(model);
  let row = 0;
  if (rows > 3) {
    grid[row++] = encodeLine(config.league.toUpperCase(), 'center', cols);
  }
  const pinned = (config.teams ?? []).map((t) => t.toUpperCase());
  const involvesPinned = (g: Game) =>
    pinned.includes(g.home.abbrev.toUpperCase()) ||
    pinned.includes(g.away.abbrev.toUpperCase());

  let forLeague = (games ?? []).filter((g) => g.league === config.league);
  // "Only my teams" filters to games involving a picked team.
  if (config.onlyPinned && pinned.length > 0) {
    forLeague = forLeague.filter(involvesPinned);
  }
  if (forLeague.length === 0) {
    const message = config.onlyPinned && pinned.length > 0 ? 'NO TEAM GAMES' : 'NO GAMES TODAY';
    grid[Math.min(row + 1, rows - 1)] = encodeLine(message, 'center', cols);
    return grid;
  }
  const rank = (g: Game) => {
    const stateRank = g.state === 'live' ? 0 : g.state === 'pre' ? 1 : 2;
    return (involvesPinned(g) ? 0 : 10) + stateRank;
  };
  const ordered = [...forLeague].sort((a, b) => rank(a) - rank(b));
  ordered.slice(0, rows - row).forEach((game, i) => {
    grid[row + i] = gameRow(game, cols);
  });
  return grid;
}
