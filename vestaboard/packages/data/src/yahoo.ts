import type { Quote, SymbolSpec } from '@vestaboard/core';
import type { TickerProvider } from './provider.js';

interface YahooQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  currency?: string;
}

const ENDPOINT = 'https://query1.finance.yahoo.com/v7/finance/quote';

/**
 * US + TMX stock quotes from Yahoo Finance's public quote endpoint.
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

  async getQuotes(specs: SymbolSpec[]): Promise<Quote[]> {
    if (specs.length === 0) return [];
    const symbols = specs.map((s) => this.toYahooSymbol(s)).join(',');
    const url = `${this.endpoint}?symbols=${encodeURIComponent(symbols)}`;
    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        // Yahoo rejects requests without a browser-like user agent.
        'user-agent': 'Mozilla/5.0 (compatible; vestaboard-agent)',
      },
    });
    if (!res.ok) throw new Error(`yahoo quote ${res.status}`);
    const body = (await res.json()) as {
      quoteResponse?: { result?: YahooQuote[] };
    };
    const byYahoo = new Map(
      (body.quoteResponse?.result ?? []).map((q) => [q.symbol.toUpperCase(), q]),
    );
    const quotes: Quote[] = [];
    for (const spec of specs) {
      const q = byYahoo.get(this.toYahooSymbol(spec));
      if (!q || q.regularMarketPrice === undefined) continue;
      quotes.push({
        symbol: spec.symbol,
        market: spec.market,
        price: q.regularMarketPrice,
        changePercent: q.regularMarketChangePercent ?? 0,
        currency: q.currency ?? (spec.market === 'tmx' ? 'CAD' : 'USD'),
      });
    }
    return quotes;
  }
}
