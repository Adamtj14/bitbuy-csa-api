import { blankGrid, BoardModel, Grid } from '../grid.js';
import { layoutText } from '../text.js';
import type { MessageSlideConfig } from '../types.js';

/** A free-text message, word-wrapped and vertically centered on the board. */
export function renderMessage(
  config: MessageSlideConfig,
  model: BoardModel = 'flagship',
): Grid {
  const text = config.text.trim();
  if (!text) return blankGrid(model);
  return layoutText(text, { align: config.align ?? 'center', valign: 'middle', model });
}
