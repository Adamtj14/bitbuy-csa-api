import { describe, expect, it } from 'vitest';
import type { Slide } from '@vestaboard/core';
import { DataHub, DataSources } from './data.js';

const weatherSlide: Slide = {
  id: 'w',
  name: 'Weather',
  enabled: true,
  order: 1,
  config: { type: 'weather', locationName: 'Toronto', latitude: 43.65, longitude: -79.38 },
};

function makeSources(overrides: Partial<DataSources> = {}): DataSources & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    getQuotes: async () => {
      calls.push('quotes');
      return [];
    },
    getWeather: async () => {
      calls.push('weather');
      return { temperature: 20, weatherCode: 0, high: 25, low: 15, daily: [] };
    },
    getNews: async () => {
      calls.push('news');
      return [{ title: 'headline' }];
    },
    getScores: async () => {
      calls.push('scores');
      return [];
    },
    ...overrides,
  };
}

describe('DataHub', () => {
  it('caches within the TTL and refetches after it', async () => {
    const sources = makeSources();
    const hub = new DataHub(sources, { feedTtlSeconds: 300 });
    await hub.contextFor(weatherSlide, new Date(0), [weatherSlide]);
    await hub.contextFor(weatherSlide, new Date(100_000), [weatherSlide]);
    expect(sources.calls).toEqual(['weather']);
    await hub.contextFor(weatherSlide, new Date(400_000), [weatherSlide]);
    expect(sources.calls).toEqual(['weather', 'weather']);
  });

  it('keeps stale data when a refresh fails', async () => {
    let fail = false;
    const sources = makeSources({
      getWeather: async () => {
        if (fail) throw new Error('down');
        return { temperature: 20, weatherCode: 0, high: 25, low: 15, daily: [] };
      },
    });
    const hub = new DataHub(sources, { feedTtlSeconds: 1 });
    const first = await hub.contextFor(weatherSlide, new Date(0), [weatherSlide]);
    expect(first.weather?.temperature).toBe(20);
    fail = true;
    const second = await hub.contextFor(weatherSlide, new Date(10_000), [weatherSlide]);
    expect(second.weather?.temperature).toBe(20);
  });

  it('fetches nothing for clock and painter slides', async () => {
    const sources = makeSources();
    const hub = new DataHub(sources);
    const slide: Slide = {
      id: 'c',
      name: 'Clock',
      enabled: true,
      order: 1,
      config: { type: 'clock', style: 'word' },
    };
    const ctx = await hub.contextFor(slide, new Date(0), [slide]);
    expect(sources.calls).toEqual([]);
    expect(ctx.quotes).toBeUndefined();
  });
});
