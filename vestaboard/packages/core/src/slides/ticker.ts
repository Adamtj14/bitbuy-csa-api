import { BLANK, COLOR } from '../chars.js';
import { blankGrid, COLS, Grid, ROWS } from '../grid.js';
import { encodeLine, writeAt } from '../text.js';
import type { Quote, TickerSlideConfig } from '../types.js';

/** Format a price into at most 7 characters, preferring cents. */
function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return '-';
  let s = price >= 1 ? price.toFixed(2) : price.toFixed(4);
  if (s.length > 7) s = String(Math.round(price));
  return s;
}

function formatChange(pct: number): string {
  if (!Number.isFinite(pct)) return '-';
  const abs = Math.abs(pct);
  const s = abs >= 10 ? abs.toFixed(0) : abs.toFixed(1);
  return `${pct < 0 ? '-' : '+'}${s}%`;
}


/**
 * One quote per row: color chip (green up / red down), symbol,
 * right-aligned price and percent change.
 *
 *   G BTC     91234  +2.3%
 */
function quoteRow(quote: Quote): number[] {
  const row = Array<number>(COLS).fill(BLANK);
  row[0] = quote.changePercent < 0 ? COLOR.red : COLOR.green;
  // Strip pair suffixes like "BTC/CAD" down to the base symbol.
  const symbol = quote.symbol.split('/')[0] ?? quote.symbol;
  writeAt(row, 2, symbol.slice(0, 7));
  const price = formatPrice(quote.price);
  writeAt(row, 16 - price.length, price);
  const change = formatChange(quote.changePercent);
  writeAt(row, COLS - change.length, change);
  return row;
}

export function renderTicker(config: TickerSlideConfig, quotes: Quote[]): Grid {
  const grid = blankGrid();
  let row = 0;
  if (config.title) {
    grid[row++] = encodeLine(config.title, 'center');
  }
  const bySymbol = new Map(
    quotes.map((q) => [`${q.market}:${q.symbol.toUpperCase()}`, q]),
  );
  for (const spec of config.symbols) {
    if (row >= ROWS) break;
    const quote = bySymbol.get(`${spec.market}:${spec.symbol.toUpperCase()}`);
    if (quote) {
      grid[row] = quoteRow(quote);
    } else {
      const line = Array<number>(COLS).fill(BLANK);
      writeAt(line, 2, spec.symbol.split('/')[0]?.slice(0, 7) ?? '');
      writeAt(line, COLS - 5, '. . .');
      grid[row] = line;
    }
    row++;
  }
  return grid;
}
