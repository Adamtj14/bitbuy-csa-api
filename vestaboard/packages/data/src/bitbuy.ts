import type { Quote, SymbolSpec } from '@vestaboard/core';
import type { TickerProvider } from './provider.js';

interface CsaTicker {
  ticker: string;
  lastPrice: number;
  midPrice: number;
  open24h: number;
}

interface CsaFeed {
  asOf: string;
  tickers: CsaTicker[];
}

/**
 * Crypto quotes (CAD pairs) from the Bitbuy CSA feed — the same JSON
 * shape served by this repo's /api/csa-feed. Pass the deployed feed URL.
 */
export class BitbuyProvider implements TickerProvider {
  readonly name = 'bitbuy';

  constructor(private readonly feedUrl: string) {}

  supports(spec: SymbolSpec): boolean {
    return spec.market === 'crypto';
  }

  async getQuotes(specs: SymbolSpec[]): Promise<Quote[]> {
    const res = await fetch(this.feedUrl, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`bitbuy feed ${res.status}`);
    const feed = (await res.json()) as CsaFeed;
    const byPair = new Map(
      feed.tickers.map((t) => [t.ticker.toUpperCase(), t]),
    );
    const quotes: Quote[] = [];
    for (const spec of specs) {
      // Accept "BTC" or "BTC/CAD"; the feed keys on full pairs.
      const pair = spec.symbol.includes('/')
        ? spec.symbol.toUpperCase()
        : `${spec.symbol.toUpperCase()}/CAD`;
      const t = byPair.get(pair);
      if (!t) continue;
      const price = t.lastPrice || t.midPrice;
      const changePercent =
        t.open24h > 0 ? ((price - t.open24h) / t.open24h) * 100 : 0;
      quotes.push({
        symbol: spec.symbol,
        market: spec.market,
        price,
        changePercent,
        currency: 'CAD',
      });
    }
    return quotes;
  }
}
