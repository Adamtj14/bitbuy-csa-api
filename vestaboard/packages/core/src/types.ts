import type { BoardModel, Grid } from './grid.js';

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

export interface WeatherSlideConfig {
  type: 'weather';
  /** Display name for the location row, e.g. "TORONTO". */
  locationName: string;
  latitude: number;
  longitude: number;
  units?: 'metric' | 'imperial';
  /** How many forecast days to show (0-3). Default 3. */
  forecastDays?: number;
}

export interface NewsSlideConfig {
  type: 'news';
  /** RSS/Atom feed URLs, tried in order. */
  feeds: string[];
  title?: string;
}

export type League = 'nhl' | 'nba' | 'mlb' | 'nfl';

export interface SportsSlideConfig {
  type: 'sports';
  league: League;
  /** Abbreviations to pin first (e.g. ["TOR"]); empty shows all games. */
  teams?: string[];
}

export type SlideTypeConfig =
  | ClockSlideConfig
  | TickerSlideConfig
  | PainterSlideConfig
  | WeatherSlideConfig
  | NewsSlideConfig
  | SportsSlideConfig;

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
  /** User id of the creator; members may only edit their own slides. */
  createdBy?: string;
}

export interface RotationSettings {
  /** Seconds between slide changes; clamped to MIN_FREQUENCY_SECONDS. */
  frequencySeconds: number;
}

/** The document the web app edits and the agent consumes (slides.json). */
export interface BoardConfig {
  /** Which physical board this config targets. Default 'flagship'. */
  boardModel?: BoardModel;
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

export interface DailyForecast {
  /** ISO date, e.g. "2026-07-10". */
  date: string;
  high: number;
  low: number;
  /** WMO weather code from Open-Meteo. */
  weatherCode: number;
}

export interface WeatherData {
  temperature: number;
  /** WMO weather code for current conditions. */
  weatherCode: number;
  high: number;
  low: number;
  precipitationChance?: number;
  daily: DailyForecast[];
}

export interface NewsItem {
  title: string;
  source?: string;
}

export type GameState = 'pre' | 'live' | 'final';

export interface Game {
  league: League;
  home: { abbrev: string; score: number };
  away: { abbrev: string; score: number };
  state: GameState;
  /** "7:30 PM" for pre, "P2 8:44" for live, "FINAL"/"FINAL OT" for final. */
  statusText: string;
}

/** Everything a renderer may need; fetching happens outside the render. */
export interface RenderContext {
  now: Date;
  /** Board model to render for. Default 'flagship'. */
  model?: BoardModel;
  quotes?: Quote[];
  weather?: WeatherData;
  news?: NewsItem[];
  games?: Game[];
}
