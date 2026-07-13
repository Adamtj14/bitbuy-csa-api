import {
  BoardModel,
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
  createNewsDigester,
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
  /** AI-distilled board lines; [] when no Anthropic key is configured. */
  getNewsDigest(feeds: string[], boardModel?: BoardModel): Promise<string[]>;
  getScores(league: League): Promise<Game[]>;
}

export interface SourceOptions {
  /** Optional CoinGecko demo/pro key; raises the free rate limit. */
  coingeckoApiKey?: string;
  /** Anthropic key that enables the AI news digest. */
  anthropicApiKey?: string;
}

const MOCK_DIGEST = [
  'RATE CUT EXPECTED THIS FALL',
  'NEW WATERFRONT TRAIL OPENS',
  'CHIP MAKER BEATS FORECASTS',
];

/**
 * Live fetchers by default; deterministic mocks when MOCK_DATA=1 (dev).
 * Crypto quotes come from CoinGecko (free, keyless), stocks from Yahoo,
 * the optional news digest from Claude.
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
      getNewsDigest: async () => MOCK_DIGEST,
      getScores: async (league) => mockGames(league),
    };
  }
  const coingeckoKey = options.coingeckoApiKey || env.COINGECKO_API_KEY;
  const providers: TickerProvider[] = [
    new CoinGeckoProvider({ apiKey: coingeckoKey }),
    new YahooProvider(),
  ];
  const digest = createNewsDigester({
    apiKey: options.anthropicApiKey || env.ANTHROPIC_API_KEY,
    model: env.ANTHROPIC_NEWS_MODEL,
  });
  return {
    getQuotes: (specs) => routeQuotes(providers, specs),
    getWeather: (config) => fetchWeather(config),
    getNews: (feeds) => fetchNews(feeds),
    getNewsDigest: (feeds, boardModel) => digest(feeds, boardModel),
    getScores: (league) => fetchScores(league),
  };
}
