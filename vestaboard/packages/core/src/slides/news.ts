import { COLOR } from '../chars.js';
import { blankGrid, BoardModel, dimsOf, Grid } from '../grid.js';
import { encodeLine, wrapText, writeAt } from '../text.js';
import type { NewsItem, NewsSlideConfig } from '../types.js';

const INDENT = 2;

/**
 * Bulleted headlines, wrapped, as many as fit (the Note skips the
 * title row to keep all three rows for headlines):
 *
 *        HEADLINES
 *   O RATE CUT EXPECTED
 *     THIS FALL
 *   O LEAFS SIGN GOALIE
 */
export function renderNews(
  config: NewsSlideConfig,
  news?: NewsItem[],
  model: BoardModel = 'flagship',
  digest?: string[],
): Grid {
  const { rows, cols } = dimsOf(model);
  const grid = blankGrid(model);
  let row = 0;
  if (config.title && rows > 3) {
    grid[row++] = encodeLine(config.title, 'center', cols);
  }

  // Digest mode: print the AI-distilled lines as-is (already board-width).
  if (config.mode === 'digest' && digest && digest.length > 0) {
    for (const line of digest) {
      if (row >= rows) break;
      grid[row++] = encodeLine(line.slice(0, cols), 'left', cols);
    }
    return grid;
  }

  if (!news || news.length === 0) {
    grid[Math.min(row + 1, rows - 1)] = encodeLine('NEWS PENDING . . .', 'center', cols);
    return grid;
  }
  for (const item of news) {
    if (row >= rows) break;
    const lines = wrapText(item.title, cols - INDENT);
    if (lines.length === 0) continue;
    grid[row]![0] = COLOR.orange;
    for (const line of lines) {
      if (row >= rows) break;
      writeAt(grid[row]!, INDENT, line);
      row++;
    }
  }
  return grid;
}
