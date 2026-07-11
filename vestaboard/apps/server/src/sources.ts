import {
  Game,
  League,
  NewsItem,
  Quote,
  SymbolSpec,
  WeatherData,
  WeatherSlideConfig,
} from '@vestaboard/core';
import {
  BitbuyProvider,
  fetchNews,
  fetchScores,
  fetchWeather,
  MOCK_NEWS,
  MOCK_WEATHER,
  mockGames,
  MockProvider,
  routeQuotes,
  TickerProvider,
  YahooProvider,
} from '@vestaboard/data';

export interface DataSources {
  getQuotes(specs: SymbolSpec[]): Promise<Quote[]>;
  getWeather(config: Pick<WeatherSlideConfig, 'latitude' | 'longitude'>): Promise<WeatherData>;
  getNews(feeds: string[]): Promise<NewsItem[]>;
  getScores(league: League): Promise<Game[]>;
}

/** Live fetchers by default; deterministic mocks when MOCK_DATA=1 (dev). */
export function buildSources(env: NodeJS.ProcessEnv = process.env): DataSources {
  if (env.MOCK_DATA === '1') {
    const mock = new MockProvider();
    return {
      getQuotes: (specs) => mock.getQuotes(specs),
      getWeather: async () => MOCK_WEATHER,
      getNews: async () => MOCK_NEWS,
      getScores: async (league) => mockGames(league),
    };
  }
  const providers: TickerProvider[] = [];
  if (env.CSA_FEED_URL) providers.push(new BitbuyProvider(env.CSA_FEED_URL));
  providers.push(new YahooProvider());
  return {
    getQuotes: (specs) => routeQuotes(providers, specs),
    getWeather: (config) => fetchWeather(config),
    getNews: (feeds) => fetchNews(feeds),
    getScores: (league) => fetchScores(league),
  };
}
