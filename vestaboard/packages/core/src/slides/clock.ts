import { COLOR, ColorName } from '../chars.js';
import { blankGrid, COLS, Grid } from '../grid.js';
import { encodeLine, layoutText } from '../text.js';
import type { ClockSlideConfig } from '../types.js';

interface TimeParts {
  hour24: number;
  minute: number;
  weekday: string;
  month: string;
  day: number;
  year: number;
}

function getTimeParts(date: Date, timeZone?: string): TimeParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    // Intl may report midnight as "24" in hour12:false mode.
    hour24: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: parts.weekday ?? '',
    month: parts.month ?? '',
    day: Number(parts.day),
    year: Number(parts.year),
  };
}

function formatTime(hour24: number, minute: number, hour12: boolean): string {
  const mm = String(minute).padStart(2, '0');
  if (!hour12) return `${String(hour24).padStart(2, '0')}:${mm}`;
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h}:${mm} ${hour24 < 12 ? 'AM' : 'PM'}`;
}

/** 3x5 block font for digits, rows top to bottom, 1 = lit cell. */
const DIGIT_FONT: Record<string, number[]> = {
  '0': [0b111, 0b101, 0b101, 0b101, 0b111],
  '1': [0b010, 0b110, 0b010, 0b010, 0b111],
  '2': [0b111, 0b001, 0b111, 0b100, 0b111],
  '3': [0b111, 0b001, 0b111, 0b001, 0b111],
  '4': [0b101, 0b101, 0b111, 0b001, 0b001],
  '5': [0b111, 0b100, 0b111, 0b001, 0b111],
  '6': [0b111, 0b100, 0b111, 0b101, 0b111],
  '7': [0b111, 0b001, 0b001, 0b010, 0b010],
  '8': [0b111, 0b101, 0b111, 0b101, 0b111],
  '9': [0b111, 0b101, 0b111, 0b001, 0b111],
  ':': [0b0, 0b1, 0b0, 0b1, 0b0],
};

const GLYPH_WIDTH: Record<string, number> = { ':': 1 };

/** Time as 5-row block digits (rows 0-4), AM/PM on the bottom row. */
function renderBigDigital(parts: TimeParts, hour12: boolean, color: ColorName): Grid {
  const grid = blankGrid();
  const chip = COLOR[color];
  const h = hour12 ? (parts.hour24 % 12 === 0 ? 12 : parts.hour24 % 12) : parts.hour24;
  const hh = hour12 ? String(h) : String(h).padStart(2, '0');
  const text = `${hh}:${String(parts.minute).padStart(2, '0')}`;

  const widths = [...text].map((ch) => GLYPH_WIDTH[ch] ?? 3);
  const total = widths.reduce((a, b) => a + b, 0) + (text.length - 1);
  let col = Math.max(0, Math.floor((COLS - total) / 2));

  for (const [i, ch] of [...text].entries()) {
    const glyph = DIGIT_FONT[ch];
    const width = widths[i] ?? 3;
    if (glyph) {
      for (let r = 0; r < 5; r++) {
        const bits = glyph[r] ?? 0;
        for (let c = 0; c < width; c++) {
          if ((bits >> (width - 1 - c)) & 1) {
            const row = grid[r];
            if (row && col + c < COLS) row[col + c] = chip;
          }
        }
      }
    }
    col += width + 1;
  }
  if (hour12) {
    grid[5] = encodeLine(parts.hour24 < 12 ? 'AM' : 'PM', 'center');
  }
  return grid;
}

function renderDigitalDate(parts: TimeParts, hour12: boolean): Grid {
  const grid = blankGrid();
  grid[1] = encodeLine(formatTime(parts.hour24, parts.minute, hour12), 'center');
  grid[3] = encodeLine(parts.weekday.toUpperCase(), 'center');
  grid[4] = encodeLine(
    `${parts.month.toUpperCase()} ${parts.day} ${parts.year}`,
    'center',
  );
  return grid;
}

const HOUR_WORDS = [
  'TWELVE', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX',
  'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN',
];

/** "IT IS HALF PAST TEN" — minutes rounded to the nearest five. */
function renderWordClock(parts: TimeParts): Grid {
  const rounded = Math.round(parts.minute / 5) * 5;
  let hour = parts.hour24;
  let phrase: string;
  const minuteWords: Record<number, string> = {
    5: 'FIVE PAST', 10: 'TEN PAST', 15: 'QUARTER PAST',
    20: 'TWENTY PAST', 25: 'TWENTY FIVE PAST', 30: 'HALF PAST',
    35: 'TWENTY FIVE TO', 40: 'TWENTY TO', 45: 'QUARTER TO',
    50: 'TEN TO', 55: 'FIVE TO',
  };
  if (rounded === 0 || rounded === 60) {
    if (rounded === 60) hour += 1;
    phrase = `${HOUR_WORDS[hour % 12]} O'CLOCK`;
  } else if (rounded > 30) {
    phrase = `${minuteWords[rounded]} ${HOUR_WORDS[(hour + 1) % 12]}`;
  } else {
    phrase = `${minuteWords[rounded]} ${HOUR_WORDS[hour % 12]}`;
  }
  return layoutText(`IT IS ${phrase}`, { align: 'center', valign: 'middle' });
}

export interface ClockRenderOptions {
  /** Chip color for the big-digital style. */
  color?: ColorName;
}

export function renderClock(
  config: ClockSlideConfig,
  now: Date,
  options: ClockRenderOptions = {},
): Grid {
  const parts = getTimeParts(now, config.timeZone);
  const hour12 = config.hour12 ?? true;
  switch (config.style) {
    case 'big-digital':
      return renderBigDigital(parts, hour12, options.color ?? 'white');
    case 'digital-date':
      return renderDigitalDate(parts, hour12);
    case 'word':
      return renderWordClock(parts);
  }
}
