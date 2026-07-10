import { blankGrid, BoardConfig, MIN_FREQUENCY_SECONDS, Slide } from '@vestaboard/core';

const STORAGE_KEY = 'vestaboard-config-v1';

export function defaultConfig(): BoardConfig {
  return {
    rotation: { frequencySeconds: 30 },
    slides: [
      {
        id: newId(),
        name: 'Word clock',
        enabled: true,
        order: 1,
        config: { type: 'clock', style: 'word' },
      },
    ],
  };
}

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
  }
}

export function loadConfig(): BoardConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as BoardConfig;
  } catch {
    // fall through to defaults
  }
  return defaultConfig();
}

export function saveConfig(config: BoardConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
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
