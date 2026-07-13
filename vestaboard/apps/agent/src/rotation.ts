import {
  activeSlides,
  blankGrid,
  BoardConfig,
  Grid,
  gridsEqual,
  isSleeping,
  MIN_FREQUENCY_SECONDS,
  render,
  RenderContext,
  Slide,
  TransitionStrategy,
} from '@vestaboard/core';
import { RateLimitedError } from './board.js';

export interface RotationDeps {
  getConfig(): Promise<BoardConfig>;
  /** Build the render context for a slide (see DataHub). */
  getContext(slide: Slide, now: Date, allSlides: Slide[]): Promise<RenderContext>;
  push(grid: Grid, transition?: TransitionStrategy): Promise<void>;
  now(): Date;
  log(message: string): void;
}

export interface RotationOptions {
  /** How often to re-pull config so admin changes apply. Default 60s. */
  configRefreshSeconds?: number;
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

  private activeSlides(now: Date): Slide[] {
    return this.config ? activeSlides(this.config, now) : [];
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

  /**
   * One scheduler step: refresh inputs, advance the slide when due,
   * render, push if changed. Returns ms to sleep before the next tick.
   */
  async tick(): Promise<number> {
    const now = this.deps.now();
    const nowMs = now.getTime();
    await this.refreshConfig(nowMs);

    const freqMs = this.frequencyMs();

    // Sleep window: blank the board once and idle (no overnight flap cycling).
    if (this.config && isSleeping(this.config, now)) {
      const blank = blankGrid(this.config.boardModel ?? 'flagship');
      await this.pushIfChanged(blank, 'asleep (sleep hours)');
      return Math.min(freqMs, 60_000);
    }

    const slides = this.activeSlides(now);
    if (slides.length === 0) {
      this.deps.log('no active slides right now');
      return Math.min(freqMs, 60_000);
    }

    if (this.slideIndex < 0 || nowMs - this.lastAdvanceAt >= freqMs) {
      this.slideIndex = (this.slideIndex + 1) % slides.length;
      this.lastAdvanceAt = nowMs;
    }
    const slide = slides[this.slideIndex % slides.length]!;

    const ctx = await this.deps.getContext(slide, now, slides);
    ctx.model = this.config?.boardModel ?? 'flagship';
    const grid = render(slide.config, ctx);
    await this.pushIfChanged(grid, slide.name, slide.transition);

    // Wake at least once a minute so clock slides stay current, but
    // never faster than the board's hardware floor.
    return Math.max(Math.min(freqMs, 60_000), MIN_FREQUENCY_SECONDS * 1000);
  }

  /** Push a grid unless the board already shows it. */
  private async pushIfChanged(
    grid: Grid,
    label: string,
    transition?: TransitionStrategy,
  ): Promise<void> {
    if (this.lastPushed && gridsEqual(grid, this.lastPushed)) {
      this.deps.log(`skip "${label}" (board already shows this grid)`);
      return;
    }
    try {
      await this.deps.push(grid, transition);
      this.lastPushed = grid;
      this.deps.log(`pushed "${label}"`);
    } catch (err) {
      if (err instanceof RateLimitedError) {
        this.deps.log(`rate limited pushing "${label}", retrying next tick`);
      } else {
        this.deps.log(`push failed for "${label}": ${String(err)}`);
      }
    }
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
