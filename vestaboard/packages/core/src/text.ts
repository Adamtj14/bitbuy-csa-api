import { charToCode, CHAR_TO_CODE, BLANK } from './chars.js';
import { blankGrid, COLS, Grid, ROWS } from './grid.js';

export type Align = 'left' | 'center' | 'right';
export type VAlign = 'top' | 'middle' | 'bottom';

/**
 * Encode one line of text into a COLS-wide row of codes. Text longer
 * than the row is truncated; unsupported characters become blanks.
 */
export function encodeLine(text: string, align: Align = 'left'): number[] {
  const codes = [...text.toUpperCase()]
    .filter((ch) => CHAR_TO_CODE.has(ch))
    .slice(0, COLS)
    .map((ch) => charToCode(ch));
  const pad = COLS - codes.length;
  const left = align === 'right' ? pad : align === 'center' ? Math.floor(pad / 2) : 0;
  return [
    ...Array<number>(left).fill(BLANK),
    ...codes,
    ...Array<number>(pad - left).fill(BLANK),
  ];
}

/** Word-wrap text into lines no wider than `width`, breaking long words. */
export function wrapText(text: string, width: number = COLS): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    for (let word of words) {
      while (word.length > width) {
        if (line) {
          lines.push(line);
          line = '';
        }
        lines.push(word.slice(0, width));
        word = word.slice(width);
      }
      if (!line) {
        line = word;
      } else if (line.length + 1 + word.length <= width) {
        line += ' ' + word;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export interface LayoutOptions {
  align?: Align;
  valign?: VAlign;
}

/**
 * Word-wrap `text` onto a fresh grid. Lines beyond ROWS are dropped.
 */
export function layoutText(text: string, options: LayoutOptions = {}): Grid {
  const { align = 'left', valign = 'top' } = options;
  const lines = wrapText(text).slice(0, ROWS);
  const grid = blankGrid();
  const pad = ROWS - lines.length;
  const top = valign === 'bottom' ? pad : valign === 'middle' ? Math.floor(pad / 2) : 0;
  lines.forEach((line, i) => {
    grid[top + i] = encodeLine(line, align);
  });
  return grid;
}

/** Write a line into an existing grid at `row` (mutates and returns it). */
export function writeLine(grid: Grid, row: number, text: string, align: Align = 'left'): Grid {
  if (row >= 0 && row < ROWS) grid[row] = encodeLine(text, align);
  return grid;
}
