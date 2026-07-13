import { BoardModel, dimsOf, NewsItem } from '@vestaboard/core';
import { fetchNews } from './news.js';

const DEFAULT_ENDPOINT = 'https://api.anthropic.com/v1/messages';
export const DEFAULT_NEWS_MODEL = 'claude-haiku-4-5';

export interface SummarizeOptions {
  apiKey: string;
  model?: string;
  boardModel?: BoardModel;
  /** Override the Anthropic endpoint (tests). */
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
}

/**
 * Distill headlines into a board-sized news digest using Claude — a few
 * ALL-CAPS lines, each within the board width. Returns [] on any error so
 * callers can fall back to raw headlines. Cheap model, called rarely
 * (the caller caches for ~2h).
 */
export async function summarizeNews(
  items: NewsItem[],
  options: SummarizeOptions,
): Promise<string[]> {
  if (items.length === 0) return [];
  const { rows, cols } = dimsOf(options.boardModel);
  const maxLines = Math.max(1, rows - 1); // leave a row for the slide title
  const fetchImpl = options.fetchImpl ?? fetch;

  const headlines = items
    .slice(0, 12)
    .map((it, i) => `${i + 1}. ${it.title}${it.detail ? ` — ${it.detail}` : ''}`)
    .join('\n');

  const system =
    `You write news for a Vestaboard split-flap display. Distill the day's ` +
    `top stories into at most ${maxLines} lines. Each line MUST be ${cols} ` +
    `characters or fewer, ALL CAPS, letters/digits/spaces and simple ` +
    `punctuation only. Be punchy and specific; no numbering, no quotes, no ` +
    `emoji. Return ONLY the lines, one per line.`;

  try {
    const res = await fetchImpl(options.endpoint ?? DEFAULT_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': options.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model ?? DEFAULT_NEWS_MODEL,
        max_tokens: 300,
        system,
        messages: [{ role: 'user', content: `Today's headlines:\n${headlines}` }],
      }),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}`);
    const body = (await res.json()) as AnthropicResponse;
    const text = (body.content ?? [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('\n');
    return text
      .split('\n')
      .map((l) => l.replace(/^\s*[-*\d.]+\s*/, '').trim().toUpperCase())
      .filter((l) => l.length > 0)
      .slice(0, maxLines)
      .map((l) => l.slice(0, cols));
  } catch {
    return [];
  }
}

export interface DigesterOptions {
  apiKey?: string;
  model?: string;
  /** Digest cache TTL; defaults to 2 hours. */
  ttlMs?: number;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

/**
 * A cached news digester: fetches the feeds and summarizes them, reusing
 * the result for `ttlMs` (default 2h) so the model is called ~12×/day.
 * Returns [] when no API key is configured (caller falls back to headlines).
 */
export function createNewsDigester(options: DigesterOptions) {
  const ttl = options.ttlMs ?? 2 * 60 * 60 * 1000;
  const cache = new Map<string, { value: string[]; at: number }>();
  return async (feeds: string[], boardModel?: BoardModel): Promise<string[]> => {
    if (!options.apiKey) return [];
    const key = `${feeds.join('|')}|${boardModel ?? 'flagship'}`;
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && now - hit.at < ttl) return hit.value;
    const items = await fetchNews(feeds, options.fetchImpl).catch(() => [] as NewsItem[]);
    const lines = await summarizeNews(items, {
      apiKey: options.apiKey,
      model: options.model,
      boardModel,
      endpoint: options.endpoint,
      fetchImpl: options.fetchImpl,
    });
    if (lines.length > 0) cache.set(key, { value: lines, at: now });
    return lines;
  };
}
