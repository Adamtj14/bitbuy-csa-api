import {
  activeSlides,
  blankGrid,
  BoardConfig,
  Game,
  Grid,
  gridsEqual,
  isSleeping,
  League,
  locationKey,
  MIN_FREQUENCY_SECONDS,
  NewsItem,
  Quote,
  render,
  RenderContext,
  Slide,
  WeatherData,
} from '@vestaboard/core';
import { RateLimitedError, VestaboardCloudClient } from './vestaboard.js';
import { DataSources } from './sources.js';

export interface PusherStatus {
  /** Whether a Vestaboard key is currently configured. */
  pushEnabled: boolean;
  /** Name of the last slide successfully pushed, if any. */
  lastPushedSlide: string | null;
  /** ISO timestamp of the last successful push. */
  lastPushAt: string | null;
  /** Human-readable last error (rate limit, network, etc.), if any. */
  lastError: string | null;
}

export interface PusherDeps {
  getConfig(): BoardConfig;
  sources: DataSources;
  /**
   * The cloud client to push with, or null when no Vestaboard key is
   * configured. Called each tick so a key set at runtime (from the
   * Settings screen) is picked up without a restart.
   */
  getClient(): Pick<VestaboardCloudClient, 'postMessage'> | null;
  now(): Date;
  log(message: string): void;
  /** Optional: notified after each tick with the current push status. */
  onStatus?(status: PusherStatus): void;
}

export interface PusherOptions {
  /** How long fetched data stays fresh. Quotes default 60s, feeds 300s. */
  quoteTtlSeconds?: number;
  feedTtlSeconds?: number;
}

interface CacheEntry<T> {
  value: T;
  fetchedAt: number;
}

/** How often to re-check for a key while cloud push is idle (no key set). */
const IDLE_POLL_MS = 5000;

/**
 * Renders the active slide from the stored config and pushes it to the
 * board over the Vestaboard cloud API on the rotation interval. Same
 * behaviour as the Pi agent (15s floor, identical-grid skip, minute
 * clock refresh, stale-data fallback) but running inside the server, so
 * no LAN device is needed.
 */
export class BoardPusher {
  private slideIndex = -1;
  private lastAdvanceAt = 0;
  private lastPushed: Grid | null = null;
  private stopped = false;
  private noKeyLogged = false;
  private status: PusherStatus = {
    pushEnabled: false,
    lastPushedSlide: null,
    lastPushAt: null,
    lastError: null,
  };

  private quotes?: CacheEntry<Quote[]>;
  private weather = new Map<string, CacheEntry<WeatherData>>();
  private news = new Map<string, CacheEntry<NewsItem[]>>();
  private games = new Map<League, CacheEntry<Game[]>>();

  constructor(
    private readonly deps: PusherDeps,
    private readonly options: PusherOptions = {},
  ) {}

  private fresh(entry: CacheEntry<unknown> | undefined, ttlSeconds: number, nowMs: number) {
    return entry !== undefined && nowMs - entry.fetchedAt < ttlSeconds * 1000;
  }

  private async buildContext(
    slide: Slide,
    enabled: Slide[],
    now: Date,
    model: RenderContext['model'],
  ): Promise<RenderContext> {
    const nowMs = now.getTime();
    const quoteTtl = this.options.quoteTtlSeconds ?? 60;
    const feedTtl = this.options.feedTtlSeconds ?? 300;
    const ctx: RenderContext = { now };
    const config = slide.config;
    const { sources, log } = this.deps;

    try {
      switch (config.type) {
        case 'ticker': {
          const specs = enabled.flatMap((s) =>
            s.config.type === 'ticker' ? s.config.symbols : [],
          );
          if (!this.fresh(this.quotes, quoteTtl, nowMs)) {
            this.quotes = { value: await sources.getQuotes(specs), fetchedAt: nowMs };
          }
          ctx.quotes = this.quotes?.value;
          break;
        }
        case 'weather': {
          const key = locationKey(config);
          if (!this.fresh(this.weather.get(key), feedTtl, nowMs)) {
            this.weather.set(key, { value: await sources.getWeather(config), fetchedAt: nowMs });
          }
          ctx.weather = this.weather.get(key)?.value;
          break;
        }
        case 'multiweather': {
          const byLocation: Record<string, WeatherData> = {};
          for (const loc of config.locations) {
            const key = locationKey(loc);
            if (!this.fresh(this.weather.get(key), feedTtl, nowMs)) {
              this.weather.set(key, { value: await sources.getWeather(loc), fetchedAt: nowMs });
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
            this.news.set(key, { value: await sources.getNews(config.feeds), fetchedAt: nowMs });
          }
          ctx.news = this.news.get(key)?.value;
          if (config.mode === 'digest') {
            // The digester caches its own 2h result; safe to call each tick.
            ctx.newsDigest = await sources.getNewsDigest(config.feeds, model);
          }
          break;
        }
        case 'sports': {
          if (!this.fresh(this.games.get(config.league), feedTtl, nowMs)) {
            this.games.set(config.league, {
              value: await sources.getScores(config.league),
              fetchedAt: nowMs,
            });
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
    } catch (err) {
      // Stale data (or a pending message from the renderer) beats a blank board.
      log(`data fetch failed for "${slide.name}", using cached/none: ${String(err)}`);
      ctx.quotes = this.quotes?.value;
    }
    return ctx;
  }

  getStatus(): PusherStatus {
    return { ...this.status };
  }

  private emitStatus(patch: Partial<PusherStatus>): void {
    this.status = { ...this.status, ...patch };
    this.deps.onStatus?.(this.getStatus());
  }

  /** One scheduler step; returns ms to sleep before the next tick. */
  async tick(): Promise<number> {
    const now = this.deps.now();
    const nowMs = now.getTime();
    const config = this.deps.getConfig();

    const client = this.deps.getClient();
    if (!client) {
      // No Vestaboard key yet — poll every few seconds so a key set from the
      // Settings screen starts pushing promptly, without a restart.
      if (!this.noKeyLogged) {
        this.deps.log('no Vestaboard key set — not pushing (set one in Settings)');
        this.noKeyLogged = true;
      }
      this.emitStatus({ pushEnabled: false });
      return IDLE_POLL_MS;
    }
    if (this.noKeyLogged) {
      this.deps.log('Vestaboard key configured — cloud push enabled');
      this.noKeyLogged = false;
    }
    this.emitStatus({ pushEnabled: true });

    const freqMs = Math.max(config.rotation.frequencySeconds, MIN_FREQUENCY_SECONDS) * 1000;

    // Sleep window: blank the board (pushed once thanks to the identical-grid
    // skip) and idle, so the flaps aren't cycling overnight.
    if (isSleeping(config, now)) {
      const blank = blankGrid(config.boardModel ?? 'flagship');
      await this.pushGrid(client, blank, 'asleep (sleep hours)');
      return Math.min(freqMs, 60_000);
    }

    const enabled = activeSlides(config, now);
    if (enabled.length === 0) {
      this.deps.log('no active slides right now — nothing to push');
      return Math.min(freqMs, 60_000);
    }
    if (this.slideIndex < 0 || nowMs - this.lastAdvanceAt >= freqMs) {
      this.slideIndex = (this.slideIndex + 1) % enabled.length;
      this.lastAdvanceAt = nowMs;
    }
    const slide = enabled[this.slideIndex % enabled.length]!;

    const model = config.boardModel ?? 'flagship';
    const ctx = await this.buildContext(slide, enabled, now, model);
    ctx.model = model;
    const grid = render(slide.config, ctx);
    await this.pushGrid(client, grid, slide.name);
    return Math.max(Math.min(freqMs, 60_000), MIN_FREQUENCY_SECONDS * 1000);
  }

  /** Push a grid, skipping if the board already shows it; updates status. */
  private async pushGrid(
    client: Pick<VestaboardCloudClient, 'postMessage'>,
    grid: Grid,
    label: string,
  ): Promise<void> {
    if (this.lastPushed && gridsEqual(grid, this.lastPushed)) {
      this.deps.log(`skip "${label}" (board already shows this grid)`);
      return;
    }
    try {
      await client.postMessage(grid);
      this.lastPushed = grid;
      this.deps.log(`pushed "${label}"`);
      this.emitStatus({
        lastPushedSlide: label,
        lastPushAt: this.deps.now().toISOString(),
        lastError: null,
      });
    } catch (err) {
      if (err instanceof RateLimitedError) {
        this.deps.log(`rate limited pushing "${label}", retrying next tick`);
        this.emitStatus({ lastError: 'rate limited by Vestaboard, retrying' });
      } else {
        this.deps.log(`push failed for "${label}": ${String(err)}`);
        this.emitStatus({ lastError: String(err) });
      }
    }
  }

  async run(sleep: (ms: number) => Promise<void>): Promise<void> {
    this.deps.log('cloud pusher started');
    while (!this.stopped) {
      let delay = MIN_FREQUENCY_SECONDS * 1000;
      try {
        delay = await this.tick();
      } catch (err) {
        this.deps.log(`tick failed: ${String(err)}`);
        delay = 30_000;
      }
      await sleep(delay);
    }
  }

  stop(): void {
    this.stopped = true;
  }
}
