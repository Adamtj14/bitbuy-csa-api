import { COLOR } from '../chars.js';
import { blankGrid, COLS, Grid, ROWS } from '../grid.js';
import { encodeLine, wrapText, writeAt } from '../text.js';
import type { NewsItem, NewsSlideConfig } from '../types.js';

const INDENT = 2;


/**
 * Bulleted headlines, wrapped, as many as fit:
 *
 *        HEADLINES
 *   O RATE CUT EXPECTED
 *     THIS FALL
 *   O LEAFS SIGN GOALIE
 */
export function renderNews(config: NewsSlideConfig, news?: NewsItem[]): Grid {
  const grid = blankGrid();
  let row = 0;
  if (config.title) {
    grid[row++] = encodeLine(config.title, 'center');
  }
  if (!news || news.length === 0) {
    grid[Math.min(row + 1, ROWS - 1)] = encodeLine('NEWS PENDING . . .', 'center');
    return grid;
  }
  for (const item of news) {
    if (row >= ROWS) break;
    const lines = wrapText(item.title, COLS - INDENT);
    // Skip a headline we can't at least start on the remaining rows.
    if (lines.length === 0) continue;
    grid[row]![0] = COLOR.orange;
    for (const line of lines) {
      if (row >= ROWS) break;
      writeAt(grid[row]!, INDENT, line);
      row++;
    }
  }
  return grid;
}
