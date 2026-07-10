import { describe, expect, it } from 'vitest';
import { blankGrid } from '../grid.js';
import { COLOR } from '../chars.js';
import { renderPainter } from './painter.js';

describe('renderPainter', () => {
  it('returns the stored grid untouched when valid', () => {
    const grid = blankGrid();
    grid[0]![0] = COLOR.red;
    grid[5]![21] = 26;
    const out = renderPainter({ type: 'painter', grid });
    expect(out).toEqual(grid);
    expect(out).not.toBe(grid); // must be a copy
  });

  it('blanks invalid codes', () => {
    const grid = blankGrid();
    grid[1]![1] = 99;
    grid[1]![2] = 43; // gap in the code table
    const out = renderPainter({ type: 'painter', grid });
    expect(out[1]![1]).toBe(0);
    expect(out[1]![2]).toBe(0);
  });

  it('returns a blank board for malformed grids', () => {
    const out = renderPainter({ type: 'painter', grid: [[1, 2, 3]] });
    expect(out).toEqual(blankGrid());
  });
});
