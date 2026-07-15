import { BLANK, COLOR } from '../chars.js';
import { blankGrid, BoardModel, dimsOf, Grid } from '../grid.js';
import { encodeLine, writeAt } from '../text.js';
import type { Quote, TickerSlideConfig } from '../types.js';

/** Up to 4 significant digits, no trailing zeros ("240.5", "9123"). */
function sig4(value: number): string {
  let s = value.toPrecision(4);
  if (s.includes('e')) return String(Math.round(value));
  if (s.includes('.')) s = s.replace(/\.?0+$/, '');
  return s;
}

/**
 * Prices cap at 4 digits so big numbers stay scannable on the board:
 * 91234 -> "91.23K", 1234567 -> "1.235M", 240.5 -> "240.5".
 */
function formatPrice(price: number, max: number): string {
  if (!Number.isFinite(price)) return '-';
  let s: string;
  if (price >= 1_000_000) s = `${sig4(price / 1_000_000)}M`;
  else if (price >= 10_000) s = `${sig4(price / 1_000)}K`;
  else s = sig4(price);
  if (s.length > max) {
    s = price >= 1 ? String(Math.round(price)) : price.toFixed(max - 2);
  }
  return s;
}

function formatChange(pct: number): string {
  if (!Number.isFinite(pct)) return '-';
  const abs = Math.abs(pct);
  const s = abs >= 10 ? abs.toFixed(0) : abs.toFixed(1);
  return `${pct < 0 ? '-' : '+'}${s}%`;
}

/**
 * One quote per row: color chip (green up / red down), symbol, then
 * right-aligned price and percent change. The Note's 15 columns drop
 * the percent column and shorten the symbol:
 *
 *   flagship:  G BTC      91.23K +2.3%
 *   note:      G BTC     91.23K
 */
function quoteRow(quote: Quote, cols: number): number[] {
  const row = Array<number>(cols).fill(BLANK);
  row[0] = quote.changePercent < 0 ? COLOR.red : COLOR.green;
  // Strip pair suffixes like "BTC/CAD" down to the base symbol.
  const symbol = quote.symbol.split('/')[0] ?? quote.symbol;
  if (cols >= 22) {
    writeAt(row, 2, symbol.slice(0, 7));
    const price = formatPrice(quote.price, 7);
    writeAt(row, 16 - price.length, price);
    const change = formatChange(quote.changePercent);
    writeAt(row, cols - change.length, change);
  } else {
    writeAt(row, 2, symbol.slice(0, 4));
    const price = formatPrice(quote.price, 8);
    writeAt(row, cols - price.length, price);
  }
  return row;
}

export function renderTicker(
  config: TickerSlideConfig,
  quotes: Quote[],
  model: BoardModel = 'flagship',
): Grid {
  const { rows, cols } = dimsOf(model);
  const grid = blankGrid(model);
  let row = 0;
  if (config.title && rows > 3) {
    grid[row++] = encodeLine(config.title, 'center', cols);
  }
  const bySymbol = new Map(
    quotes.map((q) => [`${q.market}:${q.symbol.toUpperCase()}`, q]),
  );
  for (const spec of config.symbols) {
    if (row >= rows) break;
    const quote = bySymbol.get(`${spec.market}:${spec.symbol.toUpperCase()}`);
    if (quote) {
      grid[row] = quoteRow(quote, cols);
    } else {
      const line = Array<number>(cols).fill(BLANK);
      writeAt(line, 2, spec.symbol.split('/')[0]?.slice(0, cols >= 22 ? 7 : 4) ?? '');
      writeAt(line, cols - 5, '. . .');
      grid[row] = line;
    }
    row++;
  }
  return grid;
}
