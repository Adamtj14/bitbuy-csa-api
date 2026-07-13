import {
  Game,
  League,
  locationKey,
  NewsItem,
  Quote,
  RenderContext,
  Slide,
  SymbolSpec,
  WeatherData,
  WeatherSlideConfig,
} from '@vestaboard/core';

export interface DataSources {
  getQuotes(specs: SymbolSpec[]): Promise<Quote[]>;
  getWeather(config: Pick<WeatherSlideConfig, 'latitude' | 'longitude'>): Promise<WeatherData>;
  getNews(feeds: string[]): Promise<NewsItem[]>;
  /** AI-distilled board lines; [] when no Anthropic key is configured. */
  getNewsDigest?(feeds: string[]): Promise<string[]>;
  getScores(league: League): Promise<Game[]>;
}

interface CacheEntry<T> {
  value: T;
  fetchedAt: number;
}

export interface DataHubOptions {
  /** Seconds a fetched value stays fresh. Default 300 (news/sports/weather), 60 for quotes. */
  quoteTtlSeconds?: number;
  feedTtlSeconds?: number;
  log?: (message: string) => void;
}

/**
 * Fetches and caches per-slide-type data with TTLs. Failures keep the
 * previous value (stale data beats a blank board); a slide type that
 * has never fetched successfully simply stays undefined and its
 * renderer shows a pending message.
 */
export class DataHub {
  private quotes?: CacheEntry<Quote[]>;
  private weather = new Map<string, CacheEntry<WeatherData>>();
  private news = new Map<string, CacheEntry<NewsItem[]>>();
  private games = new Map<League, CacheEntry<Game[]>>();

  constructor(
    private readonly sources: DataSources,
    private readonly options: DataHubOptions = {},
  ) {}

  private log(message: string): void {
    this.options.log?.(message);
  }

  private fresh(entry: CacheEntry<unknown> | undefined, ttlSeconds: number, nowMs: number) {
    return entry !== undefined && nowMs - entry.fetchedAt < ttlSeconds * 1000;
  }

  /** Build the RenderContext for one slide, refreshing stale data it needs. */
  async contextFor(slide: Slide, now: Date, allSlides: Slide[]): Promise<RenderContext> {
    const nowMs = now.getTime();
    const quoteTtl = this.options.quoteTtlSeconds ?? 60;
    const feedTtl = this.options.feedTtlSeconds ?? 300;
    const ctx: RenderContext = { now };
    const config = slide.config;

    switch (config.type) {
      case 'ticker': {
        // Fetch every ticker slide's symbols at once so one call serves all.
        const specs = allSlides.flatMap((s) =>
          s.enabled && s.config.type === 'ticker' ? s.config.symbols : [],
        );
        if (!this.fresh(this.quotes, quoteTtl, nowMs)) {
          try {
            this.quotes = { value: await this.sources.getQuotes(specs), fetchedAt: nowMs };
          } catch (err) {
            this.log(`quotes fetch failed, reusing stale: ${String(err)}`);
          }
        }
        ctx.quotes = this.quotes?.value;
        break;
      }
      case 'weather': {
        const key = locationKey(config);
        if (!this.fresh(this.weather.get(key), feedTtl, nowMs)) {
          try {
            this.weather.set(key, {
              value: await this.sources.getWeather(config),
              fetchedAt: nowMs,
            });
          } catch (err) {
            this.log(`weather fetch failed, reusing stale: ${String(err)}`);
          }
        }
        ctx.weather = this.weather.get(key)?.value;
        break;
      }
      case 'multiweather': {
        const byLocation: Record<string, WeatherData> = {};
        for (const loc of config.locations) {
          const key = locationKey(loc);
          if (!this.fresh(this.weather.get(key), feedTtl, nowMs)) {
            try {
              this.weather.set(key, {
                value: await this.sources.getWeather(loc),
                fetchedAt: nowMs,
              });
            } catch (err) {
              this.log(`weather fetch failed for ${loc.name}, reusing stale: ${String(err)}`);
            }
          }
          const value = this.weather.get(key)?.value;
          if (value) byLocation[key] = value;
        }
        ctx.weatherByLocation = byLocation;
        break;
      }
      case 'news': {
        const key = config.feeds.join('|');
        if (!this.fresh(this.news.get(key), feedTtl, nowMs)) {
          try {
            this.news.set(key, {
              value: await this.sources.getNews(config.feeds),
              fetchedAt: nowMs,
            });
          } catch (err) {
            this.log(`news fetch failed, reusing stale: ${String(err)}`);
          }
        }
        ctx.news = this.news.get(key)?.value;
        if (config.mode === 'digest' && this.sources.getNewsDigest) {
          try {
            ctx.newsDigest = await this.sources.getNewsDigest(config.feeds);
          } catch (err) {
            this.log(`news digest failed, using headlines: ${String(err)}`);
          }
        }
        break;
      }
      case 'sports': {
        if (!this.fresh(this.games.get(config.league), feedTtl, nowMs)) {
          try {
            this.games.set(config.league, {
              value: await this.sources.getScores(config.league),
              fetchedAt: nowMs,
            });
          } catch (err) {
            this.log(`scores fetch failed, reusing stale: ${String(err)}`);
          }
        }
        ctx.games = this.games.get(config.league)?.value;
        break;
      }
      case 'clock':
      case 'worldclock':
      case 'painter':
      case 'message':
        break;
    }
    return ctx;
  }
}
