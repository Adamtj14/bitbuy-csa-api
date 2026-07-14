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

export interface TimeZoneEntry {
  /** Display label, e.g. "TORONTO". */
  label: string;
  /** IANA zone, e.g. "America/Toronto". */
  timeZone: string;
}

/** A single slide showing several clocks — one row per time zone. */
export interface WorldClockSlideConfig {
  type: 'worldclock';
  zones: TimeZoneEntry[];
  /** 12h (default) or 24h display. */
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

/** A free-text message, word-wrapped onto the board. */
export interface MessageSlideConfig {
  type: 'message';
  text: string;
  align?: 'left' | 'center' | 'right';
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

export interface WeatherLocation {
  /** Display name for the row, e.g. "TORONTO". */
  name: string;
  latitude: number;
  longitude: number;
}

/** A single slide showing several locations — one row of current conditions each. */
export interface MultiWeatherSlideConfig {
  type: 'multiweather';
  locations: WeatherLocation[];
  units?: 'metric' | 'imperial';
}

export interface NewsSlideConfig {
  type: 'news';
  /** RSS/Atom feed URLs, tried in order. */
  feeds: string[];
  title?: string;
  /**
   * 'headlines' (default) lists raw headlines; 'digest' shows an
   * AI-distilled summary sized to the board (needs an Anthropic key).
   */
  mode?: 'headlines' | 'digest';
}

export type League = 'nhl' | 'nba' | 'mlb' | 'nfl';

export interface SportsSlideConfig {
  type: 'sports';
  league: League;
  /** Abbreviations to pin first (e.g. ["TOR"]); empty shows all games. */
  teams?: string[];
  /** When true (with teams set), show only games involving those teams. */
  onlyPinned?: boolean;
}

export type SlideTypeConfig =
  | ClockSlideConfig
  | WorldClockSlideConfig
  | TickerSlideConfig
  | PainterSlideConfig
  | MessageSlideConfig
  | WeatherSlideConfig
  | MultiWeatherSlideConfig
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

/**
 * A recurring time window. Empty = always. `days` are 0 (Sunday) – 6
 * (Saturday); `start`/`end` are "HH:MM" 24-hour local to the board's zone.
 * A window where start > end wraps past midnight (e.g. 22:00–06:00).
 */
export interface DaySchedule {
  days?: number[];
  start?: string;
  end?: string;
}

export interface Slide {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  config: SlideTypeConfig;
  transition?: TransitionStrategy;
  /** Only rotate this slide inside this window (empty/absent = always). */
  schedule?: DaySchedule;
  /** Pinned slides repeat after every regular slide (higher frequency). */
  pinned?: boolean;
  /** User id of the creator; members may only edit their own slides. */
  createdBy?: string;
}

export interface RotationSettings {
  /** Seconds between slide changes; clamped to MIN_FREQUENCY_SECONDS. */
  frequencySeconds: number;
}

/** A temporary pause: the board holds a pattern until `until`. */
export interface PauseState {
  /** ISO timestamp when updates resume. */
  until: string;
  /** Which pause pattern to show (see PAUSE_PATTERN_IDS). */
  patternId: string;
  /** Overlay "BRB" on the pattern. Default false. */
  brb?: boolean;
}

/** The document the web app edits and the agent consumes (slides.json). */
export interface BoardConfig {
  /** Which physical board this config targets. Default 'flagship'. */
  boardModel?: BoardModel;
  /** IANA zone used to evaluate schedules and sleep (default: host local). */
  timeZone?: string;
  rotation: RotationSettings;
  slides: Slide[];
  /** When the current time is inside this window, the board goes blank. */
  sleep?: DaySchedule;
  /** While set and in the future, the board holds a pause pattern. */
  pause?: PauseState;
  /** When true, only sports slides rotate. */
  sportsMode?: boolean;
}

/** Whether a pause is currently in effect. */
export function isPaused(config: BoardConfig, now: Date): boolean {
  if (!config.pause) return false;
  const until = Date.parse(config.pause.until);
  return Number.isFinite(until) && until > now.getTime();
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
  /** Longer body/summary text from the feed, used to distill a digest. */
  detail?: string;
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
  /** Weather per location, keyed "lat,long" — for the multi-weather slide. */
  weatherByLocation?: Record<string, WeatherData>;
  news?: NewsItem[];
  /** Board-width lines of an AI-distilled news digest (digest mode). */
  newsDigest?: string[];
  games?: Game[];
}

/** Canonical key for a weather location in RenderContext.weatherByLocation. */
export function locationKey(loc: { latitude: number; longitude: number }): string {
  return `${loc.latitude},${loc.longitude}`;
}
