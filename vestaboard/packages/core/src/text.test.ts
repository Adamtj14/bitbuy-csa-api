import { describe, expect, it } from 'vitest';
import { COLS, ROWS, toAscii } from './grid.js';
import { encodeLine, layoutText, wrapText } from './text.js';

describe('encodeLine', () => {
  it('pads to exactly COLS', () => {
    for (const align of ['left', 'center', 'right'] as const) {
      expect(encodeLine('HELLO', align)).toHaveLength(COLS);
    }
  });

  it('truncates text longer than the row', () => {
    const line = encodeLine('X'.repeat(40));
    expect(line).toHaveLength(COLS);
    expect(line.every((c) => c === 24)).toBe(true);
  });

  it('drops unsupported characters before layout', () => {
    expect(encodeLine('A~B')).toEqual(encodeLine('AB'));
  });
});

describe('wrapText', () => {
  it('wraps on word boundaries', () => {
    expect(wrapText('THE QUICK BROWN FOX JUMPS OVER', 12)).toEqual([
      'THE QUICK',
      'BROWN FOX',
      'JUMPS OVER',
    ]);
  });

  it('breaks words longer than the width', () => {
    expect(wrapText('ABCDEFGHIJKLMNOP', 5)).toEqual(['ABCDE', 'FGHIJ', 'KLMNO', 'P']);
  });

  it('handles empty input', () => {
    expect(wrapText('', COLS)).toEqual(['']);
  });
});

describe('layoutText', () => {
  it('renders centered, middle-aligned text', () => {
    const grid = layoutText('IT IS HALF PAST TEN', { align: 'center', valign: 'middle' });
    expect(grid).toHaveLength(ROWS);
    expect(toAscii(grid)).toMatchInlineSnapshot(`
      "+----------------------+
      |                      |
      |                      |
      | IT IS HALF PAST TEN  |
      |                      |
      |                      |
      |                      |
      +----------------------+"
    `);
  });

  it('drops lines beyond the board height', () => {
    const grid = layoutText(Array(10).fill('ROW').join('\n'));
    expect(grid).toHaveLength(ROWS);
  });
});
