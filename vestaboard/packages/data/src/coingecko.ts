import type { Quote, SymbolSpec } from '@vestaboard/core';
import type { TickerProvider } from './provider.js';

const ENDPOINT = 'https://api.coingecko.com/api/v3/simple/price';

/**
 * Ticker → CoinGecko coin id for the common coins. Anything not listed
 * falls back to the lowercased symbol as the id, so a user can also enter
 * a CoinGecko id directly (e.g. "the-open-network").
 */
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  LTC: 'litecoin',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  BCH: 'bitcoin-cash',
  XLM: 'stellar',
  USDT: 'tether',
  USDC: 'usd-coin',
  SHIB: 'shiba-inu',
  TRX: 'tron',
  ATOM: 'cosmos',
  UNI: 'uniswap',
  ETC: 'ethereum-classic',
  NEAR: 'near',
  ALGO: 'algorand',
  FIL: 'filecoin',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  SUI: 'sui',
  TON: 'the-open-network',
};

interface Parsed {
  spec: SymbolSpec;
  id: string;
  vs: string; // lower-case vs currency, e.g. "cad"
}

/** Split "BTC/CAD" → { base: BTC, vs: CAD }; bare "BTC" defaults to CAD. */
function parse(spec: SymbolSpec): Parsed {
  const raw = spec.symbol.trim().toUpperCase();
  const [base, quote] = raw.includes('/') ? raw.split('/') : [raw, 'CAD'];
  const id = SYMBOL_TO_ID[base ?? ''] ?? (base ?? '').toLowerCase();
  return { spec, id, vs: (quote || 'CAD').toLowerCase() };
}

type PriceResponse = Record<string, Record<string, number>>;

export interface CoinGeckoOptions {
  /** Optional CoinGecko demo/pro API key (sent as x-cg-demo-api-key). */
  apiKey?: string;
  endpoint?: string;
}

/**
 * Live crypto quotes from CoinGecko's free public price API — no key
 * required (an optional demo key raises the rate limit). Replaces the
 * Bitbuy CSA feed, which returns placeholder prices rather than a real
 * market quote. Prices default to CAD; use "SYM/USD" for another quote.
 */
export class CoinGeckoProvider implements TickerProvider {
  readonly name = 'coingecko';
  private readonly apiKey?: string;
  private readonly endpoint: string;

  constructor(options: CoinGeckoOptions = {}) {
    this.apiKey = options.apiKey;
    this.endpoint = options.endpoint ?? ENDPOINT;
  }

  supports(spec: SymbolSpec): boolean {
    return spec.market === 'crypto';
  }

  async getQuotes(specs: SymbolSpec[]): Promise<Quote[]> {
    if (specs.length === 0) return [];
    const parsed = specs.map(parse);
    const ids = [...new Set(parsed.map((p) => p.id))];
    const vsCurrencies = [...new Set(parsed.map((p) => p.vs))];
    const url =
      `${this.endpoint}?ids=${encodeURIComponent(ids.join(','))}` +
      `&vs_currencies=${encodeURIComponent(vsCurrencies.join(','))}` +
      `&include_24hr_change=true`;

    const headers: Record<string, string> = { accept: 'application/json' };
    if (this.apiKey) headers['x-cg-demo-api-key'] = this.apiKey;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`coingecko ${res.status}`);
    const body = (await res.json()) as PriceResponse;

    const quotes: Quote[] = [];
    for (const { spec, id, vs } of parsed) {
      const coin = body[id];
      const price = coin?.[vs];
      if (price === undefined) continue;
      quotes.push({
        symbol: spec.symbol,
        market: spec.market,
        price,
        changePercent: coin?.[`${vs}_24h_change`] ?? 0,
        currency: vs.toUpperCase(),
      });
    }
    return quotes;
  }
}
