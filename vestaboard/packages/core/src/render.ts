import type { Grid } from './grid.js';
import type { RenderContext, SlideTypeConfig } from './types.js';
import { renderClock } from './slides/clock.js';
import { renderTicker } from './slides/ticker.js';
import { renderPainter } from './slides/painter.js';
import { renderWeather } from './slides/weather.js';
import { renderNews } from './slides/news.js';
import { renderSports } from './slides/sports.js';

/**
 * The single entry point shared by the web preview and the local agent,
 * so what the user previews is exactly what the board shows. The grid
 * shape follows ctx.model (flagship 6x22 or Note 3x15).
 */
export function render(config: SlideTypeConfig, ctx: RenderContext): Grid {
  const model = ctx.model ?? 'flagship';
  switch (config.type) {
    case 'clock':
      return renderClock(config, ctx.now, {}, model);
    case 'ticker':
      return renderTicker(config, ctx.quotes ?? [], model);
    case 'painter':
      return renderPainter(config, model);
    case 'weather':
      return renderWeather(config, ctx.weather, model);
    case 'news':
      return renderNews(config, ctx.news, model);
    case 'sports':
      return renderSports(config, ctx.games, model);
  }
}
