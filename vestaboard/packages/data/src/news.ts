import { XMLParser } from 'fast-xml-parser';
import type { NewsItem } from '@vestaboard/core';

const parser = new XMLParser({ ignoreAttributes: false });

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '#text' in value) {
    return String((value as { '#text': unknown })['#text']);
  }
  return '';
}

/** Parse RSS 2.0 or Atom XML into headline items. */
export function parseFeed(xml: string): NewsItem[] {
  const doc = parser.parse(xml) as Record<string, any>;
  const channel = doc?.rss?.channel;
  if (channel) {
    const source = textOf(channel.title) || undefined;
    return asArray(channel.item).map((item: any) => ({
      title: textOf(item?.title).trim(),
      source,
    }));
  }
  const feed = doc?.feed;
  if (feed) {
    const source = textOf(feed.title) || undefined;
    return asArray(feed.entry).map((entry: any) => ({
      title: textOf(entry?.title).trim(),
      source,
    }));
  }
  return [];
}

/**
 * Fetch headlines from the first feed URL that responds; later URLs
 * are fallbacks.
 */
export async function fetchNews(
  feeds: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<NewsItem[]> {
  let lastError: unknown = new Error('no feeds configured');
  for (const url of feeds) {
    try {
      const res = await fetchImpl(url, {
        headers: { accept: 'application/rss+xml, application/atom+xml, text/xml, */*' },
      });
      if (!res.ok) throw new Error(`feed ${res.status}`);
      const items = parseFeed(await res.text()).filter((i) => i.title.length > 0);
      if (items.length > 0) return items;
      throw new Error('feed had no items');
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
