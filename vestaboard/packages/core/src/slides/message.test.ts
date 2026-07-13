import { describe, expect, it } from 'vitest';
import { toAscii } from '../grid.js';
import { renderMessage } from './message.js';

describe('renderMessage', () => {
  it('word-wraps and vertically centers text', () => {
    const lines = toAscii(
      renderMessage({ type: 'message', text: 'HELLO WORLD FROM THE BOARD' }, 'flagship'),
    ).split('\n');
    // border + 6 rows + border = 8 lines; text should be centered (not on row 0)
    expect(lines).toHaveLength(8);
    const textRows = lines.slice(1, 7).filter((l) => /[A-Z]/.test(l));
    expect(textRows.length).toBeGreaterThan(0);
    expect(lines.join(' ')).toContain('HELLO');
    expect(lines.join(' ')).toContain('BOARD');
  });

  it('renders blank for empty text', () => {
    const grid = renderMessage({ type: 'message', text: '   ' }, 'flagship');
    expect(grid.every((row) => row.every((c) => c === 0))).toBe(true);
  });

  it('fits the Note (3x15)', () => {
    const grid = renderMessage({ type: 'message', text: 'HI THERE' }, 'note');
    expect(grid).toHaveLength(3);
    expect(grid.every((r) => r.length === 15)).toBe(true);
  });
});
