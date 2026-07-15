import type { Quote, SymbolSpec } from '@vestaboard/core';
import type { TickerProvider } from './provider.js';

interface ChartMeta {
  currency?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
}

interface ChartResponse {
  chart?: { result?: Array<{ meta?: ChartMeta }> };
}

// Yahoo retired the unauthenticated v7 quote endpoint (it now returns
// 401 Unauthorized), so quotes come from the still-public v8 chart
// endpoint — one request per symbol, cached upstream for ~60s.
const ENDPOINT = 'https://query1.finance.yahoo.com/v8/finance/chart';

/**
 * US + TMX stock quotes from Yahoo Finance's public chart endpoint.
 * TMX symbols are queried with Yahoo's ".TO" suffix ("SHOP" -> "SHOP.TO").
 */
export class YahooProvider implements TickerProvider {
  readonly name = 'yahoo';

  constructor(private readonly endpoint: string = ENDPOINT) {}

  supports(spec: SymbolSpec): boolean {
    return spec.market === 'us' || spec.market === 'tmx';
  }

  private toYahooSymbol(spec: SymbolSpec): string {
    const symbol = spec.symbol.toUpperCase();
    if (spec.market === 'tmx' && !symbol.endsWith('.TO')) return `${symbol}.TO`;
    return symbol;
  }

  private async fetchQuote(spec: SymbolSpec): Promise<Quote> {
    const symbol = this.toYahooSymbol(spec);
    const url = `${this.endpoint}/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        // Yahoo rejects requests without a browser-like user agent.
        'user-agent': 'Mozilla/5.0 (compatible; vestaboard-agent)',
      },
    });
    if (!res.ok) throw new Error(`yahoo chart ${res.status}`);
    const body = (await res.json()) as ChartResponse;
    const meta = body.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    if (price === undefined) throw new Error(`yahoo: no price for ${symbol}`);
    const previous = meta?.chartPreviousClose ?? meta?.previousClose;
    return {
      symbol: spec.symbol,
      market: spec.market,
      price,
      changePercent: previous ? ((price - previous) / previous) * 100 : 0,
      currency: meta?.currency ?? (spec.market === 'tmx' ? 'CAD' : 'USD'),
    };
  }

  async getQuotes(specs: SymbolSpec[]): Promise<Quote[]> {
    if (specs.length === 0) return [];
    const results = await Promise.allSettled(specs.map((spec) => this.fetchQuote(spec)));
    return results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  }
}
