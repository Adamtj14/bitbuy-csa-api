import { BLANK, codeToChar, isColorCode, COLOR } from './chars.js';

export const ROWS = 6;
export const COLS = 22;

/** A 6x22 grid of Vestaboard character codes, row-major. */
export type Grid = number[][];

export function blankGrid(fill: number = BLANK): Grid {
  return Array.from({ length: ROWS }, () => Array<number>(COLS).fill(fill));
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function gridsEqual(a: Grid, b: Grid): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if ((a[r]?.[c] ?? BLANK) !== (b[r]?.[c] ?? BLANK)) return false;
    }
  }
  return true;
}

export function isGrid(value: unknown): value is Grid {
  return (
    Array.isArray(value) &&
    value.length === ROWS &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === COLS &&
        row.every((cell) => Number.isInteger(cell)),
    )
  );
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
 * Render a grid as fixed-width ASCII for tests and the agent's dry-run
 * output. Color chips render as single letters (G=green, K=black, F=filled).
 */
export function toAscii(grid: Grid): string {
  const border = '+' + '-'.repeat(COLS) + '+';
  const lines = grid.map((row) => {
    const cells = row.map((code) =>
      isColorCode(code) ? (COLOR_ASCII[code] ?? '?') : codeToChar(code),
    );
    return '|' + cells.join('') + '|';
  });
  return [border, ...lines, border].join('\n');
}
