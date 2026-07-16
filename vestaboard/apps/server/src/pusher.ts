import {
  activeSlides,
  blankGrid,
  BoardConfig,
  Game,
  Grid,
  gridsEqual,
  isPaused,
  isSleeping,
  League,
  locationKey,
  MIN_FREQUENCY_SECONDS,
  NewsItem,
  Quote,
  render,
  RenderContext,
  renderPausePattern,
  rotationSequence,
  Slide,
  SportsSlideConfig,
  TransitionStrategy,
  WeatherData,
} from '@vestaboard/core';
import { RateLimitedError } from './vestaboard.js';
import { DataSources } from './sources.js';

/** Which transport delivered a push. */
export type PushPath = 'local' | 'cloud';

/**
 * Anything that can put a grid on the board. The transition only takes
 * effect on the Local API path (the cloud API has no strategy parameter);
 * clients that know their transport return it so status can show it.
 */
export interface PushClient {
  postMessage(grid: Grid, transition?: TransitionStrategy): Promise<PushPath | void>;
}

export interface PusherStatus {
  /** Whether a Vestaboard key is currently configured. */
  pushEnabled: boolean;
  /** Name of the last slide successfully pushed, if any. */
  lastPushedSlide: string | null;
  /** ISO timestamp of the last successful push. */
  lastPushAt: string | null;
  /** Human-readable last error (rate limit, network, etc.), if any. */
  lastError: string | null;
  /** The grid the board currently shows (last successful push). */
  lastGrid?: Grid | null;
  /** Transport of the last successful push (local = transitions active). */
  via?: PushPath | null;
}

export interface PusherDeps {
  getConfig(): BoardConfig;
  sources: DataSources;
  /**
   * The client to push with, or null when no Vestaboard key is
   * configured. Called each tick so a key set at runtime (from the
   * Settings screen) is picked up without a restart.
   */
  getClient(): PushClient | null;
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

/** How often to poll scores for a live-score interrupt. */
const SCORE_WATCH_MS = 30_000;

/** Stable identity for a game, so we can compare scores across polls. */
function gameKey(league: League, game: Game): string {
  return `${league}:${game.away.abbrev}@${game.home.abbrev}`;
}

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

  // Live-score interrupt state.
  private lastScores = new Map<string, string>();
  private scoreWatchAt = 0;
  private liveWatch = false;
  private pendingInterruptSlideId: string | null = null;
  private interrupt: { slideId: string; until: number; resumeAfterIndex: number } | null = null;

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
    // Board zone so blank clock slides show wall time, not server UTC.
    const ctx: RenderContext = { now, timeZone: this.deps.getConfig().timeZone };
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
    return { ...this.status, lastGrid: this.lastPushed };
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

    const model = config.boardModel ?? 'flagship';

    // Sleep window: blank the board (pushed once thanks to the identical-grid
    // skip) and idle, so the flaps aren't cycling overnight.
    if (isSleeping(config, now)) {
      await this.pushGrid(client, blankGrid(model), 'asleep (sleep hours)');
      return Math.min(freqMs, 60_000);
    }

    // Paused: hold the chosen pattern (with optional BRB) until the pause
    // ends; the identical-grid skip keeps it from re-pushing every tick.
    if (isPaused(config, now)) {
      const grid = renderPausePattern(config.pause!.patternId, model, config.pause!.brb ?? false);
      await this.pushGrid(client, grid, `paused (${config.pause!.patternId})`);
      return Math.min(freqMs, 60_000);
    }

    let enabled = activeSlides(config, now);
    // Sports mode: only sports slides rotate (ignored if there are none).
    if (config.sportsMode) {
      const sports = enabled.filter((s) => s.config.type === 'sports');
      if (sports.length > 0) enabled = sports;
      else this.deps.log('sports mode on but no active sports slides — rotating everything');
    }
    if (enabled.length === 0) {
      this.deps.log('no active slides right now — nothing to push');
      return Math.min(freqMs, 60_000);
    }
    // Play order: pinned slides interleave after every regular slide. Indexing
    // runs over the sequence; `enabled` stays the deduped set for data fan-out.
    const sequence = rotationSequence(enabled);

    // Live-score watch: flag an interrupt when a tracked game's score changes.
    await this.watchScores(enabled, nowMs);

    // A score changed → the sports slide overtakes the board immediately and
    // holds for one normal interval; then rotation resumes one slide onward.
    if (this.pendingInterruptSlideId) {
      const slide =
        enabled.find((s) => s.id === this.pendingInterruptSlideId) ??
        config.slides.find((s) => s.id === this.pendingInterruptSlideId) ??
        null;
      this.pendingInterruptSlideId = null;
      if (slide) {
        if (!this.interrupt) {
          this.interrupt = { slideId: slide.id, until: 0, resumeAfterIndex: Math.max(this.slideIndex, 0) };
        }
        this.interrupt.slideId = slide.id;
        this.interrupt.until = nowMs + freqMs;
        await this.pushSlide(client, slide, enabled, now, model, `${slide.name} (score update)`);
        return this.interruptSleep(nowMs);
      }
    }

    // Keep an active interrupt on screen until its hold expires.
    if (this.interrupt) {
      if (nowMs < this.interrupt.until) {
        const slide =
          enabled.find((s) => s.id === this.interrupt!.slideId) ??
          config.slides.find((s) => s.id === this.interrupt!.slideId) ??
          null;
        if (slide) await this.pushSlide(client, slide, enabled, now, model, `${slide.name} (score update)`);
        return this.interruptSleep(nowMs);
      }
      // Hold expired: resume one slide past whatever was showing before.
      this.slideIndex = (this.interrupt.resumeAfterIndex + 1) % sequence.length;
      this.lastAdvanceAt = nowMs;
      this.interrupt = null;
      this.deps.log('score interrupt over — resuming rotation');
    }

    // Normal rotation over the interleaved sequence.
    if (this.slideIndex < 0 || nowMs - this.lastAdvanceAt >= freqMs) {
      this.slideIndex = (this.slideIndex + 1) % sequence.length;
      this.lastAdvanceAt = nowMs;
    }
    const slide = sequence[this.slideIndex % sequence.length]!;
    await this.pushSlide(client, slide, enabled, now, model, slide.name);

    // Poll faster while a tracked game is live so goals interrupt quickly.
    const cap = this.liveWatch ? SCORE_WATCH_MS : 60_000;
    return Math.max(Math.min(freqMs, cap), MIN_FREQUENCY_SECONDS * 1000);
  }

  /** Build context for a slide, render, and push it. */
  private async pushSlide(
    client: PushClient,
    slide: Slide,
    enabled: Slide[],
    now: Date,
    model: RenderContext['model'],
    label: string,
  ): Promise<void> {
    const ctx = await this.buildContext(slide, enabled, now, model);
    ctx.model = model;
    await this.pushGrid(client, render(slide.config, ctx), label, slide.transition);
  }

  /** ms to sleep while an interrupt is held — wake near its expiry. */
  private interruptSleep(nowMs: number): number {
    const remaining = this.interrupt ? this.interrupt.until - nowMs : 0;
    return Math.min(Math.max(remaining, MIN_FREQUENCY_SECONDS * 1000), 30_000);
  }

  /**
   * Poll scores for the leagues of the enabled sports slides (throttled) and,
   * when a watched game's score changes versus the last poll, flag an
   * interrupt with that slide. Watched games are those matching a slide's
   * pinned teams (or all of the league's games if none are pinned).
   */
  private async watchScores(enabled: Slide[], nowMs: number): Promise<void> {
    const watched: Array<{ slide: Slide; config: SportsSlideConfig }> = [];
    for (const s of enabled) {
      if (s.config.type === 'sports') watched.push({ slide: s, config: s.config });
    }
    if (watched.length === 0) {
      this.liveWatch = false;
      return;
    }
    if (nowMs - this.scoreWatchAt < SCORE_WATCH_MS) return;
    this.scoreWatchAt = nowMs;

    // Fetch each league once and refresh the shared games cache.
    for (const league of new Set(watched.map((w) => w.config.league))) {
      try {
        this.games.set(league, { value: await this.deps.sources.getScores(league), fetchedAt: nowMs });
      } catch (err) {
        this.deps.log(`score watch: ${league} fetch failed: ${String(err)}`);
      }
    }

    let live = false;
    for (const { slide, config } of watched) {
      const pinned = (config.teams ?? []).map((t) => t.toUpperCase());
      if (pinned.length === 0) continue; // only interrupt for prescribed teams
      const games = this.games.get(config.league)?.value ?? [];
      const forSlide = games.filter(
        (g) =>
          pinned.includes(g.home.abbrev.toUpperCase()) ||
          pinned.includes(g.away.abbrev.toUpperCase()),
      );
      for (const game of forSlide) {
        if (game.state === 'live') live = true;
        if (game.state === 'pre') continue; // no score yet
        const key = gameKey(config.league, game);
        const score = `${game.away.score}-${game.home.score}`;
        const prev = this.lastScores.get(key);
        this.lastScores.set(key, score);
        if (prev !== undefined && prev !== score) {
          this.pendingInterruptSlideId = slide.id;
          this.deps.log(`score change ${key} ${prev} -> ${score}; interrupting with "${slide.name}"`);
        }
      }
    }
    this.liveWatch = live;
  }

  /** Push a grid, skipping if the board already shows it; updates status. */
  private async pushGrid(
    client: PushClient,
    grid: Grid,
    label: string,
    transition?: TransitionStrategy,
  ): Promise<void> {
    if (this.lastPushed && gridsEqual(grid, this.lastPushed)) {
      this.deps.log(`skip "${label}" (board already shows this grid)`);
      return;
    }
    try {
      const via = (await client.postMessage(grid, transition)) ?? 'cloud';
      this.lastPushed = grid;
      this.deps.log(`pushed "${label}" via ${via}`);
      this.emitStatus({
        lastPushedSlide: label,
        lastPushAt: this.deps.now().toISOString(),
        lastError: null,
        via,
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
