import type { Quote, SymbolSpec } from '@vestaboard/core';
import type { TickerProvider } from './provider.js';

/**
 * Deterministic fake quotes for tests and offline previews: price and
 * change derive from a hash of the symbol, so renders are stable.
 */
export class MockProvider implements TickerProvider {
  readonly name = 'mock';

  supports(): boolean {
    return true;
  }

  async getQuotes(specs: SymbolSpec[]): Promise<Quote[]> {
    return specs.map((spec) => {
      let hash = 0;
      for (const ch of spec.symbol.toUpperCase()) {
        hash = (hash * 31 + ch.charCodeAt(0)) % 1_000_003;
      }
      const price = spec.market === 'crypto' ? (hash % 90000) + 0.42 : (hash % 400) + 10.5;
      const changePercent = ((hash % 130) - 60) / 10;
      return {
        symbol: spec.symbol,
        market: spec.market,
        price,
        changePercent,
        currency: spec.market === 'us' ? 'USD' : 'CAD',
      };
    });
  }
}
