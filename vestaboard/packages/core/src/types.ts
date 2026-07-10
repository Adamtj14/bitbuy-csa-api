import type { Grid } from './grid.js';

/**
 * The board ignores repeat pushes inside a ~15 second window (physical
 * flap hardware), so rotation frequency can never go below this.
 */
export const MIN_FREQUENCY_SECONDS = 15;

export type ClockStyle = 'big-digital' | 'digital-date' | 'word';

export interface ClockSlideConfig {
  type: 'clock';
  style: ClockStyle;
  /** IANA zone, e.g. "America/Toronto". Defaults to the agent's zone. */
  timeZone?: string;
  /** 12h (default) or 24h display for the digital styles. */
  hour12?: boolean;
}

export type Market = 'crypto' | 'us' | 'tmx';

export interface SymbolSpec {
  symbol: string;
  market: Market;
}

export interface TickerSlideConfig {
  type: 'ticker';
  symbols: SymbolSpec[];
  title?: string;
}

export interface PainterSlideConfig {
  type: 'painter';
  grid: Grid;
}

export type SlideTypeConfig = ClockSlideConfig | TickerSlideConfig | PainterSlideConfig;

/**
 * Local API transition strategy, applied when the board flips to this
 * slide. Supported natively by the board firmware.
 */
export type TransitionStrategy =
  | 'column'
  | 'reverse-column'
  | 'edges-to-center'
  | 'row'
  | 'diagonal'
  | 'random';

export interface Slide {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  config: SlideTypeConfig;
  transition?: TransitionStrategy;
}

export interface RotationSettings {
  /** Seconds between slide changes; clamped to MIN_FREQUENCY_SECONDS. */
  frequencySeconds: number;
}

/** The document the web app edits and the agent consumes (slides.json). */
export interface BoardConfig {
  rotation: RotationSettings;
  slides: Slide[];
}

export interface Quote {
  symbol: string;
  market: Market;
  price: number;
  /** Percent change over 24h (crypto) or since previous close (stocks). */
  changePercent: number;
  currency: string;
}

/** Everything a renderer may need; fetching happens outside the render. */
export interface RenderContext {
  now: Date;
  quotes?: Quote[];
}
