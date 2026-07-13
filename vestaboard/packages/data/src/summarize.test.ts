import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NewsItem } from '@vestaboard/core';
import { createNewsDigester, summarizeNews } from './summarize.js';

afterEach(() => vi.restoreAllMocks());

const items: NewsItem[] = [
  { title: 'Central bank signals a rate cut this fall', detail: 'Officials hint at easing.' },
  { title: 'City opens a new waterfront trail' },
];

function mockAnthropic(text: string, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { status }),
  );
}

describe('summarizeNews', () => {
  it('returns uppercased, board-width lines with the right headers', async () => {
    const spy = mockAnthropic('Rate cut expected this fall\nNew waterfront trail opens');
    const lines = await summarizeNews(items, { apiKey: 'sk-test', boardModel: 'flagship' });
    expect(lines).toHaveLength(2);
    expect(lines[0]!.startsWith('RATE CUT EXPECTED')).toBe(true);
    expect(lines[1]!.startsWith('NEW WATERFRONT TRAIL')).toBe(true);
    expect(lines.every((l) => l.length <= 22)).toBe(true); // board width
    const [, init] = spy.mock.calls[0]!;
    const headers = init!.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-test');
    expect(headers['anthropic-version']).toBeTruthy();
  });

  it('strips list markers and caps to the row budget', async () => {
    mockAnthropic('- one\n2. two\n* three\nfour\nfive\nsix\nseven');
    const lines = await summarizeNews(items, { apiKey: 'k', boardModel: 'flagship' });
    // flagship has 6 rows → at most 5 lines (one reserved for a title)
    expect(lines.length).toBeLessThanOrEqual(5);
    expect(lines[0]).toBe('ONE');
  });

  it('falls back to [] on an API error', async () => {
    mockAnthropic('', 500);
    expect(await summarizeNews(items, { apiKey: 'k' })).toEqual([]);
  });

  it('returns [] when no items', async () => {
    expect(await summarizeNews([], { apiKey: 'k' })).toEqual([]);
  });
});

describe('createNewsDigester', () => {
  it('returns [] without an API key and never calls out', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const digest = createNewsDigester({});
    expect(await digest(['https://feed'])).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('caches the digest so the model is not re-called within the TTL', async () => {
    // First call fetches the feed then Anthropic; both mocked.
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          `<rss><channel><title>F</title><item><title>Big news today</title></item></channel></rss>`,
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ content: [{ type: 'text', text: 'BIG NEWS TODAY' }] }), {
          status: 200,
        }),
      );
    const digest = createNewsDigester({ apiKey: 'k', ttlMs: 60_000 });
    const first = await digest(['https://feed'], 'flagship');
    expect(first).toEqual(['BIG NEWS TODAY']);
    const second = await digest(['https://feed'], 'flagship');
    expect(second).toEqual(['BIG NEWS TODAY']);
    // 2 calls total (feed + anthropic) — the second digest() was served from cache
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
