import type { Quote, SymbolSpec } from '@vestaboard/core';

/**
 * A quote source for one or more markets. Providers are composed by
 * routeQuotes(), which sends each symbol to the first provider that
 * claims its market — so swapping data sources is config, not code.
 */
export interface TickerProvider {
  readonly name: string;
  supports(spec: SymbolSpec): boolean;
  getQuotes(specs: SymbolSpec[]): Promise<Quote[]>;
}

/** Fan symbols out to providers by market; failures degrade to missing quotes. */
export async function routeQuotes(
  providers: TickerProvider[],
  specs: SymbolSpec[],
): Promise<Quote[]> {
  const buckets = new Map<TickerProvider, SymbolSpec[]>();
  for (const spec of specs) {
    const provider = providers.find((p) => p.supports(spec));
    if (!provider) continue;
    const bucket = buckets.get(provider) ?? [];
    bucket.push(spec);
    buckets.set(provider, bucket);
  }
  const results = await Promise.allSettled(
    [...buckets.entries()].map(([provider, bucket]) => provider.getQuotes(bucket)),
  );
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}
