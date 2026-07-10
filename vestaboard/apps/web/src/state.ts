import { blankGrid, BoardConfig, MIN_FREQUENCY_SECONDS, Slide } from '@vestaboard/core';

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function newSlide(type: Slide['config']['type'], order: number): Slide {
  const base = { id: newId(), enabled: true, order };
  switch (type) {
    case 'clock':
      return { ...base, name: 'Clock', config: { type: 'clock', style: 'digital-date' } };
    case 'ticker':
      return {
        ...base,
        name: 'Markets',
        config: {
          type: 'ticker',
          title: 'MARKETS',
          symbols: [
            { symbol: 'BTC/CAD', market: 'crypto' },
            { symbol: 'SHOP', market: 'tmx' },
            { symbol: 'AAPL', market: 'us' },
          ],
        },
      };
    case 'painter':
      return { ...base, name: 'Painter', config: { type: 'painter', grid: blankGrid() } };
    case 'weather':
      return {
        ...base,
        name: 'Weather',
        config: {
          type: 'weather',
          locationName: 'Toronto',
          latitude: 43.6532,
          longitude: -79.3832,
        },
      };
    case 'news':
      return {
        ...base,
        name: 'Headlines',
        config: {
          type: 'news',
          title: 'HEADLINES',
          feeds: ['https://www.cbc.ca/webfeed/rss/rss-topstories'],
        },
      };
    case 'sports':
      return {
        ...base,
        name: 'Scores',
        config: { type: 'sports', league: 'nhl', teams: [] },
      };
  }
}

export function clampFrequency(seconds: number): number {
  return Math.max(Math.round(seconds) || MIN_FREQUENCY_SECONDS, MIN_FREQUENCY_SECONDS);
}

export function exportConfig(config: BoardConfig): void {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'slides.json';
  a.click();
  URL.revokeObjectURL(url);
}
