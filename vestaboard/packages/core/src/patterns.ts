import { charToCode, COLOR } from './chars.js';
import { blankGrid, BoardModel, dimsOf, Grid } from './grid.js';

/**
 * The "paused" pattern library: colour chips and board symbols only.
 * Every pattern is parametric over the board dimensions, so the same
 * design renders on the flagship (6x22) and the Note (3x15). Designs
 * were reviewed/approved in the Studio pattern gallery.
 */

const RB = [COLOR.red, COLOR.orange, COLOR.yellow, COLOR.green, COLOR.blue, COLOR.violet];
const SLASH = charToCode('/');
const DOT = charToCode('°');

/** Deterministic per-cell noise so "random" patterns are stable. */
function noise(r: number, c: number): number {
  let h = ((r * 73856093) ^ (c * 19349663)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  return h / 4294967295;
}

type Builder = (rows: number, cols: number, g: Grid) => void;

const BUILDERS: Record<string, Builder> = {
  'rainbow-columns': (R, C, g) => {
    for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) g[r]![c] = RB[c % 6]!;
  },
  'colour-bands': (R, C, g) => {
    for (let r = 0; r < R; r++) {
      const chip = RB[Math.floor((r * 6) / R) % 6]!;
      for (let c = 0; c < C; c++) g[r]![c] = chip;
    }
  },
  checkerboard: (R, C, g) => {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
      g[r]![c] = (r + c) % 2 ? COLOR.blue : COLOR.white;
  },
  'diagonal-rainbow': (R, C, g) => {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) g[r]![c] = RB[(r + c) % 6]!;
  },
  target: (R, C, g) => {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const ring = Math.min(r, R - 1 - r, c, C - 1 - c);
      g[r]![c] = RB[ring % 6]!;
    }
  },
  confetti: (R, C, g) => {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
      if (noise(r, c) < 0.4) g[r]![c] = RB[Math.floor(noise(c, r) * 6)]!;
  },
  diamond: (R, C, g) => {
    const CR = (R - 1) / 2, CC = (C - 1) / 2;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const d = Math.abs(r - CR) / CR + Math.abs(c - CC) / CC;
      if (d < 0.45) g[r]![c] = COLOR.yellow;
      else if (d < 0.8) g[r]![c] = COLOR.orange;
      else if (d < 1.05) g[r]![c] = COLOR.red;
    }
  },
  plus: (R, C, g) => {
    const CR = (R - 1) / 2, CC = (C - 1) / 2;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const midR = Math.abs(r - CR) < 0.9;
      const midC = Math.abs(c - CC) < C / 11;
      g[r]![c] = midR || midC ? COLOR.red : COLOR.white;
    }
  },
  dashes: (R, C, g) => {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
      if ((r + c) % 2 === 0) g[r]![c] = SLASH;
  },
  'dots-chips': (R, C, g) => {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
      g[r]![c] = (r + c) % 2 ? RB[c % 6]! : DOT;
  },
  bars: (R, C, g) => {
    for (let c = 0; c < C; c++) {
      if (c % 3 === 2) continue;
      const chip = RB[Math.floor(c / 3) % 6]!;
      for (let r = 0; r < R; r++) g[r]![c] = chip;
    }
  },
  'tri-block': (R, C, g) => {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
      g[r]![c] = c < C / 3 ? COLOR.red : c < (2 * C) / 3 ? COLOR.green : COLOR.blue;
  },
  'warm-cool': (R, C, g) => {
    const warm = [COLOR.red, COLOR.orange, COLOR.yellow];
    const cool = [COLOR.green, COLOR.blue, COLOR.violet];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
      g[r]![c] = c < C / 2 ? warm[r % 3]! : cool[r % 3]!;
  },
  sunburst: (R, C, g) => {
    const CR = (R - 1) / 2, CC = (C - 1) / 2;
    const stretch = (C / R) * 1.2;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const a = Math.atan2((r - CR) * stretch, c - CC);
      g[r]![c] = RB[Math.floor(((a + Math.PI) / (2 * Math.PI)) * 6) % 6]!;
    }
  },
  waves: (R, C, g) => {
    for (let c = 0; c < C; c++) {
      const wave = R * 0.43 + R * 0.28 * Math.sin(c * 0.62);
      for (let r = 0; r < R; r++) {
        if (r > wave + 0.6) g[r]![c] = COLOR.blue;
        else if (r > wave - 0.4) g[r]![c] = DOT;
      }
    }
  },
  argyle: (R, C, g) => {
    const half = Math.floor(R / 2);
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const v = Math.abs((c % 8) - 4) + Math.abs((r % R) - half);
      g[r]![c] = v <= 2 ? COLOR.violet : v === 3 ? COLOR.white : COLOR.blue;
    }
  },
  'blocky-rainbow': (R, C, g) => {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
      g[r]![c] = RB[(Math.floor(r / 2) + Math.floor(c / 3)) % 6]!;
  },
  zigzag: (R, C, g) => {
    const period = 2 * (R - 1);
    for (let c = 0; c < C; c++) {
      const t = c % period;
      const row = t < R - 1 ? t : period - t;
      g[row]![c] = COLOR.green;
      if (row + 1 < R) g[row + 1]![c] = COLOR.yellow;
    }
  },
  'symbol-rain': (R, C, g) => {
    for (let c = 0; c < C; c++) {
      const head = Math.floor(noise(c, 7) * R);
      for (let r = 0; r < R; r++) {
        if (r === head) g[r]![c] = COLOR.blue;
        else if (r < head && head - r <= 3 && (r + c) % 2 === 0) g[r]![c] = SLASH;
      }
    }
  },
  static: (R, C, g) => {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
      g[r]![c] = RB[Math.floor(noise(r * 31 + 7, c * 17 + 3) * 6)]!;
  },
};

export const PAUSE_PATTERN_IDS = Object.keys(BUILDERS);

export const PAUSE_PATTERN_NAMES: Record<string, string> = {
  'rainbow-columns': 'Rainbow columns',
  'colour-bands': 'Colour bands',
  checkerboard: 'Checkerboard',
  'diagonal-rainbow': 'Diagonal rainbow',
  target: 'Concentric target',
  confetti: 'Confetti',
  diamond: 'Diamond',
  plus: 'Plus sign',
  dashes: 'Diagonal dashes',
  'dots-chips': 'Dots & chips',
  bars: 'Vertical bars',
  'tri-block': 'Tri-block',
  'warm-cool': 'Warm / cool split',
  sunburst: 'Sunburst rays',
  waves: 'Water waves',
  argyle: 'Argyle',
  'blocky-rainbow': 'Blocky rainbow',
  zigzag: 'Zigzag',
  'symbol-rain': 'Symbol rain',
  static: 'Colour static',
};

/** Pick a random pattern id (inject rand for determinism in tests). */
export function randomPausePatternId(rand: () => number = Math.random): string {
  return PAUSE_PATTERN_IDS[Math.floor(rand() * PAUSE_PATTERN_IDS.length)]!;
}

/**
 * Render a paused-board pattern. With `brb`, a centre band is cleared and
 * "BRB" written into it (the middle row on the Note) so the label stays
 * legible over any pattern. Unknown ids fall back to the first pattern.
 */
export function renderPausePattern(
  id: string,
  model: BoardModel = 'flagship',
  brb = false,
): Grid {
  const { rows, cols } = dimsOf(model);
  const grid = blankGrid(model);
  (BUILDERS[id] ?? BUILDERS[PAUSE_PATTERN_IDS[0]!]!)(rows, cols, grid);

  if (brb) {
    const bandRows =
      rows >= 6 ? [Math.floor(rows / 2) - 1, Math.floor(rows / 2)] : [Math.floor(rows / 2)];
    for (const r of bandRows) grid[r] = Array<number>(cols).fill(0);
    const word = 'BRB';
    const start = Math.floor((cols - word.length) / 2);
    for (let i = 0; i < word.length; i++) {
      grid[bandRows[0]!]![start + i] = charToCode(word[i]!);
    }
  }
  return grid;
}
