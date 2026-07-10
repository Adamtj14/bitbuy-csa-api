import type { Game, League, NewsItem, WeatherData } from '@vestaboard/core';

/** Deterministic sample data for web previews and tests. */
export const MOCK_WEATHER: WeatherData = {
  temperature: 21,
  weatherCode: 2,
  high: 24,
  low: 16,
  precipitationChance: 30,
  daily: [
    { date: '2026-07-11', high: 24, low: 16, weatherCode: 3 },
    { date: '2026-07-12', high: 22, low: 14, weatherCode: 63 },
    { date: '2026-07-13', high: 26, low: 17, weatherCode: 0 },
  ],
};

export const MOCK_NEWS: NewsItem[] = [
  { title: 'Rate cut expected this fall', source: 'Sample Wire' },
  { title: 'City opens new waterfront trail', source: 'Sample Wire' },
  { title: 'Chip maker beats forecasts', source: 'Sample Wire' },
];

export function mockGames(league: League): Game[] {
  return [
    {
      league,
      away: { abbrev: 'TOR', score: 4 },
      home: { abbrev: 'BOS', score: 2 },
      state: 'live',
      statusText: 'P2 8:44',
    },
    {
      league,
      away: { abbrev: 'MTL', score: 1 },
      home: { abbrev: 'NYR', score: 5 },
      state: 'final',
      statusText: 'FINAL',
    },
    {
      league,
      away: { abbrev: 'VAN', score: 0 },
      home: { abbrev: 'EDM', score: 0 },
      state: 'pre',
      statusText: '7:30 PM',
    },
  ];
}
