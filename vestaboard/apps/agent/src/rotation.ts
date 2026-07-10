import {
  BoardConfig,
  Grid,
  gridsEqual,
  MIN_FREQUENCY_SECONDS,
  Quote,
  render,
  Slide,
  SymbolSpec,
  TransitionStrategy,
} from '@vestaboard/core';
import { RateLimitedError } from './board.js';

export interface RotationDeps {
  getConfig(): Promise<BoardConfig>;
  getQuotes(specs: SymbolSpec[]): Promise<Quote[]>;
  push(grid: Grid, transition?: TransitionStrategy): Promise<void>;
  now(): Date;
  log(message: string): void;
}

export interface RotationOptions {
  /** How often to re-pull config so admin changes apply. Default 60s. */
  configRefreshSeconds?: number;
  /** How long fetched quotes stay fresh. Default 60s. */
  quoteTtlSeconds?: number;
}

/**
 * Cycles enabled slides at the configured frequency (never below the
 * board's ~15s hardware floor), re-rendering the current slide each
 * wake so clocks update by the minute, and skipping pushes whose grid
 * is identical to what the board already shows.
 */
export class RotationEngine {
  private config: BoardConfig | null = null;
  private configFetchedAt = 0;
  private quotes: Quote[] = [];
  private quotesFetchedAt = 0;
  private slideIndex = -1;
  private lastAdvanceAt = 0;
  private lastPushed: Grid | null = null;
  private stopped = false;

  constructor(
    private readonly deps: RotationDeps,
    private readonly options: RotationOptions = {},
  ) {}

  private frequencyMs(): number {
    const freq = this.config?.rotation.frequencySeconds ?? 30;
    return Math.max(freq, MIN_FREQUENCY_SECONDS) * 1000;
  }

  private enabledSlides(): Slide[] {
    return (this.config?.slides ?? [])
      .filter((s) => s.enabled)
      .sort((a, b) => a.order - b.order);
  }

  private async refreshConfig(nowMs: number): Promise<void> {
    const ttl = (this.options.configRefreshSeconds ?? 60) * 1000;
    if (this.config && nowMs - this.configFetchedAt < ttl) return;
    try {
      this.config = await this.deps.getConfig();
      this.configFetchedAt = nowMs;
    } catch (err) {
      // Keep rotating on the last good config.
      this.deps.log(`config refresh failed: ${String(err)}`);
      if (!this.config) throw err;
    }
  }

  private async refreshQuotes(slides: Slide[], nowMs: number): Promise<void> {
    const specs = slides.flatMap((s) =>
      s.config.type === 'ticker' ? s.config.symbols : [],
    );
    if (specs.length === 0) return;
    const ttl = (this.options.quoteTtlSeconds ?? 60) * 1000;
    if (nowMs - this.quotesFetchedAt < ttl && this.quotes.length > 0) return;
    try {
      this.quotes = await this.deps.getQuotes(specs);
      this.quotesFetchedAt = nowMs;
    } catch (err) {
      // Stale quotes beat a blank board.
      this.deps.log(`quote refresh failed, reusing stale data: ${String(err)}`);
    }
  }

  /**
   * One scheduler step: refresh inputs, advance the slide when due,
   * render, push if changed. Returns ms to sleep before the next tick.
   */
  async tick(): Promise<number> {
    const now = this.deps.now();
    const nowMs = now.getTime();
    await this.refreshConfig(nowMs);

    const slides = this.enabledSlides();
    if (slides.length === 0) {
      this.deps.log('no enabled slides');
      return this.frequencyMs();
    }

    const freqMs = this.frequencyMs();
    if (this.slideIndex < 0 || nowMs - this.lastAdvanceAt >= freqMs) {
      this.slideIndex = (this.slideIndex + 1) % slides.length;
      this.lastAdvanceAt = nowMs;
    }
    const slide = slides[this.slideIndex % slides.length]!;

    await this.refreshQuotes(slides, nowMs);
    const grid = render(slide.config, { now, quotes: this.quotes });

    if (this.lastPushed && gridsEqual(grid, this.lastPushed)) {
      this.deps.log(`skip "${slide.name}" (board already shows this grid)`);
    } else {
      try {
        await this.deps.push(grid, slide.transition);
        this.lastPushed = grid;
        this.deps.log(`pushed "${slide.name}"`);
      } catch (err) {
        if (err instanceof RateLimitedError) {
          this.deps.log(`rate limited pushing "${slide.name}", retrying next tick`);
        } else {
          this.deps.log(`push failed for "${slide.name}": ${String(err)}`);
        }
      }
    }

    // Wake at least once a minute so clock slides stay current, but
    // never faster than the board's hardware floor.
    return Math.max(Math.min(freqMs, 60_000), MIN_FREQUENCY_SECONDS * 1000);
  }

  async run(sleep: (ms: number) => Promise<void>): Promise<void> {
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
