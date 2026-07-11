import { afterEach, describe, expect, it, vi } from 'vitest';
import { BitbuyProvider } from './bitbuy.js';
import { MockProvider } from './mock.js';
import { routeQuotes, TickerProvider } from './provider.js';
import { YahooProvider } from './yahoo.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

describe('BitbuyProvider', () => {
  it('resolves bare symbols to CAD pairs and computes 24h change', async () => {
    mockFetch({
      asOf: '2026-07-10T00:00:00Z',
      tickers: [
        { ticker: 'BTC/CAD', lastPrice: 110, midPrice: 0, open24h: 100 },
        { ticker: 'ETH/CAD', lastPrice: 0, midPrice: 50, open24h: 0 },
      ],
    });
    const provider = new BitbuyProvider('https://example.test/api/csa-feed');
    const quotes = await provider.getQuotes([
      { symbol: 'BTC', market: 'crypto' },
      { symbol: 'ETH/CAD', market: 'crypto' },
      { symbol: 'NOPE', market: 'crypto' },
    ]);
    expect(quotes).toEqual([
      { symbol: 'BTC', market: 'crypto', price: 110, changePercent: 10, currency: 'CAD' },
      { symbol: 'ETH/CAD', market: 'crypto', price: 50, changePercent: 0, currency: 'CAD' },
    ]);
  });

  it('throws on a non-200 so routing can degrade', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }));
    const provider = new BitbuyProvider('https://example.test/api/csa-feed');
    await expect(
      provider.getQuotes([{ symbol: 'BTC', market: 'crypto' }]),
    ).rejects.toThrow('503');
  });
});

describe('YahooProvider', () => {
  it('adds .TO for TMX symbols and maps results back', async () => {
    const spy = mockFetch({
      quoteResponse: {
        result: [
          { symbol: 'SHOP.TO', regularMarketPrice: 145.3, regularMarketChangePercent: 1.5, currency: 'CAD' },
          { symbol: 'AAPL', regularMarketPrice: 250.1, regularMarketChangePercent: -0.4, currency: 'USD' },
        ],
      },
    });
    const provider = new YahooProvider();
    const quotes = await provider.getQuotes([
      { symbol: 'SHOP', market: 'tmx' },
      { symbol: 'AAPL', market: 'us' },
    ]);
    expect(spy.mock.calls[0]?.[0]).toContain('SHOP.TO');
    expect(quotes).toHaveLength(2);
    expect(quotes[0]).toMatchObject({ symbol: 'SHOP', price: 145.3, currency: 'CAD' });
  });
});

describe('routeQuotes', () => {
  it('routes by market and survives a failing provider', async () => {
    const failing: TickerProvider = {
      name: 'failing',
      supports: (s) => s.market === 'us',
      getQuotes: async () => {
        throw new Error('down');
      },
    };
    const quotes = await routeQuotes(
      [failing, new MockProvider()],
      [
        { symbol: 'AAPL', market: 'us' },
        { symbol: 'BTC', market: 'crypto' },
      ],
    );
    expect(quotes).toHaveLength(1);
    expect(quotes[0]?.symbol).toBe('BTC');
  });
});

describe('MockProvider', () => {
  it('is deterministic', async () => {
    const provider = new MockProvider();
    const a = await provider.getQuotes([{ symbol: 'BTC', market: 'crypto' }]);
    const b = await provider.getQuotes([{ symbol: 'BTC', market: 'crypto' }]);
    expect(a).toEqual(b);
  });
});
