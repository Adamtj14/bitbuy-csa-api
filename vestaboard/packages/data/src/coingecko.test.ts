import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoinGeckoProvider } from './coingecko.js';

afterEach(() => vi.restoreAllMocks());

function mockFetch(body: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

describe('CoinGeckoProvider', () => {
  it('maps tickers to coin ids, defaults to CAD, and reads 24h change', async () => {
    const spy = mockFetch({
      bitcoin: { cad: 92140, cad_24h_change: 1.23 },
      ethereum: { cad: 4980, cad_24h_change: -0.4 },
    });
    const provider = new CoinGeckoProvider();
    const quotes = await provider.getQuotes([
      { symbol: 'BTC', market: 'crypto' },
      { symbol: 'ETH/CAD', market: 'crypto' },
    ]);
    const url = spy.mock.calls[0]?.[0] as string;
    expect(url).toContain('ids=bitcoin%2Cethereum');
    expect(url).toContain('vs_currencies=cad');
    expect(url).toContain('include_24hr_change=true');
    expect(quotes).toEqual([
      { symbol: 'BTC', market: 'crypto', price: 92140, changePercent: 1.23, currency: 'CAD' },
      { symbol: 'ETH/CAD', market: 'crypto', price: 4980, changePercent: -0.4, currency: 'CAD' },
    ]);
  });

  it('supports a non-CAD quote currency', async () => {
    mockFetch({ solana: { usd: 210.5, usd_24h_change: 3 } });
    const provider = new CoinGeckoProvider();
    const quotes = await provider.getQuotes([{ symbol: 'SOL/USD', market: 'crypto' }]);
    expect(quotes[0]).toEqual({
      symbol: 'SOL/USD',
      market: 'crypto',
      price: 210.5,
      changePercent: 3,
      currency: 'USD',
    });
  });

  it('falls back to the lowercased symbol as the coin id', async () => {
    const spy = mockFetch({ 'the-open-network': { cad: 8.1, cad_24h_change: 0 } });
    const provider = new CoinGeckoProvider();
    await provider.getQuotes([{ symbol: 'the-open-network', market: 'crypto' }]);
    expect(spy.mock.calls[0]?.[0]).toContain('ids=the-open-network');
  });

  it('sends the demo api key header when configured', async () => {
    const spy = mockFetch({ bitcoin: { cad: 1, cad_24h_change: 0 } });
    const provider = new CoinGeckoProvider({ apiKey: 'demo123' });
    await provider.getQuotes([{ symbol: 'BTC', market: 'crypto' }]);
    const headers = (spy.mock.calls[0]?.[1]?.headers ?? {}) as Record<string, string>;
    expect(headers['x-cg-demo-api-key']).toBe('demo123');
  });

  it('skips unknown coins and throws on a non-200', async () => {
    mockFetch({ bitcoin: { cad: 1, cad_24h_change: 0 } });
    const provider = new CoinGeckoProvider();
    const quotes = await provider.getQuotes([
      { symbol: 'BTC', market: 'crypto' },
      { symbol: 'ZZZZ', market: 'crypto' },
    ]);
    expect(quotes).toHaveLength(1);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 429 }));
    await expect(
      provider.getQuotes([{ symbol: 'BTC', market: 'crypto' }]),
    ).rejects.toThrow('429');
  });
});
