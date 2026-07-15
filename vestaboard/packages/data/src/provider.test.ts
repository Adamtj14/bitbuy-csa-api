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
  const chart = (meta: Record<string, unknown>) =>
    new Response(JSON.stringify({ chart: { result: [{ meta }] } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  it('adds .TO for TMX symbols and computes change from previous close', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes('SHOP.TO')) {
          return chart({ currency: 'CAD', regularMarketPrice: 145.3, chartPreviousClose: 143.15 });
        }
        return chart({ currency: 'USD', regularMarketPrice: 250.1, chartPreviousClose: 251.1 });
      });
    const provider = new YahooProvider();
    const quotes = await provider.getQuotes([
      { symbol: 'SHOP', market: 'tmx' },
      { symbol: 'AAPL', market: 'us' },
    ]);
    const urls = spy.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('SHOP.TO'))).toBe(true);
    expect(quotes).toHaveLength(2);
    expect(quotes[0]).toMatchObject({ symbol: 'SHOP', price: 145.3, currency: 'CAD' });
    expect(quotes[0]?.changePercent).toBeCloseTo(1.5, 1);
  });

  it('drops symbols whose chart request fails, keeps the rest', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('BAD')) return new Response('', { status: 404 });
      return chart({ currency: 'USD', regularMarketPrice: 100, chartPreviousClose: 100 });
    });
    const provider = new YahooProvider();
    const quotes = await provider.getQuotes([
      { symbol: 'BAD', market: 'us' },
      { symbol: 'AAPL', market: 'us' },
    ]);
    expect(quotes).toHaveLength(1);
    expect(quotes[0]?.symbol).toBe('AAPL');
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
