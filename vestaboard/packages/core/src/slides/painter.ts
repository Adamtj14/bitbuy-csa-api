import { blankGrid, BoardModel, cloneGrid, Grid, isGrid } from '../grid.js';
import { isValidCode, BLANK } from '../chars.js';
import type { PainterSlideConfig } from '../types.js';

/**
 * Painter slides store the literal grid. Rendering sanitizes: a grid
 * whose shape doesn't match the target board (e.g. painted for the
 * flagship but shown on a Note) becomes a blank board, and invalid
 * codes become blanks.
 */
export function renderPainter(
  config: PainterSlideConfig,
  model: BoardModel = 'flagship',
): Grid {
  if (!isGrid(config.grid, model)) return blankGrid(model);
  const grid = cloneGrid(config.grid);
  for (const row of grid) {
    for (let c = 0; c < row.length; c++) {
      if (!isValidCode(row[c] ?? BLANK)) row[c] = BLANK;
    }
  }
  return grid;
}
