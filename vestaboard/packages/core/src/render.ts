import type { Grid } from './grid.js';
import type { RenderContext, SlideTypeConfig } from './types.js';
import { renderClock } from './slides/clock.js';
import { renderTicker } from './slides/ticker.js';
import { renderPainter } from './slides/painter.js';

/**
 * The single entry point shared by the web preview and the local agent,
 * so what the user previews is exactly what the board shows.
 */
export function render(config: SlideTypeConfig, ctx: RenderContext): Grid {
  switch (config.type) {
    case 'clock':
      return renderClock(config, ctx.now);
    case 'ticker':
      return renderTicker(config, ctx.quotes ?? []);
    case 'painter':
      return renderPainter(config);
  }
}
