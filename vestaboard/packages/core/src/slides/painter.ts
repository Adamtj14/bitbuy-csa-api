import { blankGrid, cloneGrid, Grid, isGrid } from '../grid.js';
import { isValidCode, BLANK } from '../chars.js';
import type { PainterSlideConfig } from '../types.js';

/**
 * Painter slides store the literal grid. Rendering just sanitizes:
 * wrong shapes become a blank board, invalid codes become blanks.
 */
export function renderPainter(config: PainterSlideConfig): Grid {
  if (!isGrid(config.grid)) return blankGrid();
  const grid = cloneGrid(config.grid);
  for (const row of grid) {
    for (let c = 0; c < row.length; c++) {
      if (!isValidCode(row[c] ?? BLANK)) row[c] = BLANK;
    }
  }
  return grid;
}
