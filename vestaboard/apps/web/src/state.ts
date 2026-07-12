import {
  blankGrid,
  BoardConfig,
  BoardModel,
  COLOR,
  Grid,
  MIN_FREQUENCY_SECONDS,
  Slide,
  writeLine,
} from '@vestaboard/core';

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** A colourful, letter-rich board used to demo transitions for a model. */
export function sampleGrid(model: BoardModel = 'flagship'): Grid {
  const grid = blankGrid(model);
  const rainbow = [COLOR.red, COLOR.orange, COLOR.yellow, COLOR.green, COLOR.blue, COLOR.violet];
  const chips = (row: number) => {
    const line = grid[row];
    if (line) for (let c = 0; c < line.length; c++) line[c] = rainbow[c % rainbow.length]!;
  };
  if (model === 'note') {
    writeLine(grid, 0, 'VESTA', 'center');
    writeLine(grid, 1, 'BOARD', 'center');
    chips(2);
  } else {
    writeLine(grid, 0, 'VESTABOARD', 'center');
    writeLine(grid, 1, 'STUDIO', 'center');
    writeLine(grid, 3, 'TRANSITIONS', 'center');
    chips(5);
  }
  return grid;
}

export function newSlide(
  type: Slide['config']['type'],
  order: number,
  model: BoardModel = 'flagship',
): Slide {
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
      return { ...base, name: 'Painter', config: { type: 'painter', grid: blankGrid(model) } };
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
