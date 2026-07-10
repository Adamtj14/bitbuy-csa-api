import { BLANK, codeToChar, isColorCode, COLOR } from './chars.js';

/**
 * The two Vestaboard hardware models. The flagship is 6x22; the
 * Vestaboard Note is 3x15 (per the Local API docs). Everything in this
 * library is dimension-aware; 'flagship' is the default so existing
 * call sites keep working.
 */
export type BoardModel = 'flagship' | 'note';

export interface BoardDims {
  rows: number;
  cols: number;
}

export const BOARD_DIMS: Record<BoardModel, BoardDims> = {
  flagship: { rows: 6, cols: 22 },
  note: { rows: 3, cols: 15 },
};

export const BOARD_MODELS = Object.keys(BOARD_DIMS) as BoardModel[];

/** Flagship dimensions, kept as constants for the common case. */
export const ROWS = BOARD_DIMS.flagship.rows;
export const COLS = BOARD_DIMS.flagship.cols;

export function dimsOf(model: BoardModel = 'flagship'): BoardDims {
  return BOARD_DIMS[model];
}

/** A grid of Vestaboard character codes, row-major (6x22 or 3x15). */
export type Grid = number[][];

export function blankGrid(model: BoardModel = 'flagship', fill: number = BLANK): Grid {
  const { rows, cols } = dimsOf(model);
  return Array.from({ length: rows }, () => Array<number>(cols).fill(fill));
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function gridsEqual(a: Grid, b: Grid): boolean {
  if (a.length !== b.length) return false;
  for (let r = 0; r < a.length; r++) {
    const ra = a[r]!;
    const rb = b[r]!;
    if (ra.length !== rb.length) return false;
    for (let c = 0; c < ra.length; c++) {
      if (ra[c] !== rb[c]) return false;
    }
  }
  return true;
}

/** Which board model a value's shape matches, or null if neither. */
export function gridModelOf(value: unknown): BoardModel | null {
  if (!Array.isArray(value)) return null;
  for (const model of BOARD_MODELS) {
    const { rows, cols } = BOARD_DIMS[model];
    if (
      value.length === rows &&
      value.every(
        (row) =>
          Array.isArray(row) &&
          row.length === cols &&
          row.every((cell) => Number.isInteger(cell)),
      )
    ) {
      return model;
    }
  }
  return null;
}

export function isGrid(value: unknown, model?: BoardModel): value is Grid {
  const found = gridModelOf(value);
  return model ? found === model : found !== null;
}

const COLOR_ASCII: Record<number, string> = {
  [COLOR.red]: 'R',
  [COLOR.orange]: 'O',
  [COLOR.yellow]: 'Y',
  [COLOR.green]: 'G',
  [COLOR.blue]: 'B',
  [COLOR.violet]: 'V',
  [COLOR.white]: 'W',
  [COLOR.black]: 'K',
  [COLOR.filled]: 'F',
};

/**
 * Render a grid (any shape) as fixed-width ASCII for tests and the
 * agent's dry-run output. Color chips render as single letters
 * (G=green, K=black, F=filled).
 */
export function toAscii(grid: Grid): string {
  const width = grid[0]?.length ?? 0;
  const border = '+' + '-'.repeat(width) + '+';
  const lines = grid.map((row) => {
    const cells = row.map((code) =>
      isColorCode(code) ? (COLOR_ASCII[code] ?? '?') : codeToChar(code),
    );
    return '|' + cells.join('') + '|';
  });
  return [border, ...lines, border].join('\n');
}
