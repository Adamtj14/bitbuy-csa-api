import { describe, expect, it } from 'vitest';
import { toAscii } from '../grid.js';
import type { Quote } from '../types.js';
import { renderTicker } from './ticker.js';

const quotes: Quote[] = [
  { symbol: 'BTC/CAD', market: 'crypto', price: 91234.12, changePercent: 2.34, currency: 'CAD' },
  { symbol: 'ETH/CAD', market: 'crypto', price: 4123.55, changePercent: -1.2, currency: 'CAD' },
  { symbol: 'SHOP', market: 'tmx', price: 145.3, changePercent: 0, currency: 'CAD' },
  { symbol: 'PEPE/CAD', market: 'crypto', price: 0.0000123, changePercent: 12.5, currency: 'CAD' },
];

describe('renderTicker', () => {
  it('renders chip, symbol, price and change per row', () => {
    const grid = renderTicker(
      {
        type: 'ticker',
        title: 'MARKETS',
        symbols: [
          { symbol: 'BTC/CAD', market: 'crypto' },
          { symbol: 'ETH/CAD', market: 'crypto' },
          { symbol: 'SHOP', market: 'tmx' },
        ],
      },
      quotes,
    );
    expect(toAscii(grid)).toMatchInlineSnapshot(`
      "+----------------------+
      |       MARKETS        |
      |G BTC      91234 +2.3%|
      |R ETH    4123.55 -1.2%|
      |G SHOP    145.30 +0.0%|
      |                      |
      |                      |
      +----------------------+"
    `);
  });

  it('shows a pending placeholder for symbols without quotes', () => {
    const grid = renderTicker(
      { type: 'ticker', symbols: [{ symbol: 'MISSING', market: 'us' }] },
      [],
    );
    expect(toAscii(grid)).toContain('MISSING');
    expect(toAscii(grid)).toContain('. . .');
  });

  it('formats sub-dollar prices with four decimals', () => {
    const grid = renderTicker(
      { type: 'ticker', symbols: [{ symbol: 'PEPE/CAD', market: 'crypto' }] },
      quotes,
    );
    expect(toAscii(grid)).toContain('0.0000');
  });

  it('never renders more symbols than rows', () => {
    const grid = renderTicker(
      {
        type: 'ticker',
        title: 'T',
        symbols: Array.from({ length: 10 }, (_, i) => ({
          symbol: `S${i}`,
          market: 'us' as const,
        })),
      },
      [],
    );
    expect(grid).toHaveLength(6);
  });
});
