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
  CoinGeckoProvider,
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

export interface SourceOptions {
  /** Optional CoinGecko demo/pro key; raises the free rate limit. */
  coingeckoApiKey?: string;
}

/**
 * Live fetchers by default; deterministic mocks when MOCK_DATA=1 (dev).
 * Crypto quotes come from CoinGecko (free, keyless), stocks from Yahoo.
 */
export function buildSources(
  env: NodeJS.ProcessEnv = process.env,
  options: SourceOptions = {},
): DataSources {
  if (env.MOCK_DATA === '1') {
    const mock = new MockProvider();
    return {
      getQuotes: (specs) => mock.getQuotes(specs),
      getWeather: async () => MOCK_WEATHER,
      getNews: async () => MOCK_NEWS,
      getScores: async (league) => mockGames(league),
    };
  }
  const apiKey = options.coingeckoApiKey || env.COINGECKO_API_KEY;
  const providers: TickerProvider[] = [
    new CoinGeckoProvider({ apiKey }),
    new YahooProvider(),
  ];
  return {
    getQuotes: (specs) => routeQuotes(providers, specs),
    getWeather: (config) => fetchWeather(config),
    getNews: (feeds) => fetchNews(feeds),
    getScores: (league) => fetchScores(league),
  };
}
