import { describe, expect, it } from 'vitest';
import { charToCode, isColorCode } from './chars.js';
import {
  PAUSE_PATTERN_IDS,
  PAUSE_PATTERN_NAMES,
  randomPausePatternId,
  renderPausePattern,
} from './patterns.js';
import { isPaused } from './types.js';
import type { BoardConfig } from './types.js';

describe('pause patterns', () => {
  it('has 20 named patterns', () => {
    expect(PAUSE_PATTERN_IDS).toHaveLength(20);
    for (const id of PAUSE_PATTERN_IDS) expect(PAUSE_PATTERN_NAMES[id]).toBeTruthy();
  });

  it('renders every pattern on both models with valid codes', () => {
    for (const id of PAUSE_PATTERN_IDS) {
      for (const [model, rows, cols] of [
        ['flagship', 6, 22],
        ['note', 3, 15],
      ] as const) {
        const grid = renderPausePattern(id, model);
        expect(grid, `${id} ${model}`).toHaveLength(rows);
        for (const row of grid) {
          expect(row).toHaveLength(cols);
          for (const code of row) {
            const ok = code === 0 || isColorCode(code) || code === charToCode('/') || code === charToCode('°');
            expect(ok, `${id} ${model} code ${code}`).toBe(true);
          }
        }
      }
    }
  });

  it('is deterministic', () => {
    for (const id of PAUSE_PATTERN_IDS) {
      expect(renderPausePattern(id)).toEqual(renderPausePattern(id));
    }
  });

  it('BRB overlay clears a centre band and writes the label', () => {
    const grid = renderPausePattern('checkerboard', 'flagship', true);
    const start = Math.floor((22 - 3) / 2);
    expect(grid[2]![start]).toBe(charToCode('B'));
    expect(grid[2]![start + 1]).toBe(charToCode('R'));
    expect(grid[2]![start + 2]).toBe(charToCode('B'));
    // rest of the band is blank
    expect(grid[3]!.every((c) => c === 0)).toBe(true);
    // Note: single middle row
    const note = renderPausePattern('checkerboard', 'note', true);
    expect(note[1]![Math.floor((15 - 3) / 2)]).toBe(charToCode('B'));
  });

  it('randomPausePatternId picks a member of the set', () => {
    expect(PAUSE_PATTERN_IDS).toContain(randomPausePatternId(() => 0));
    expect(PAUSE_PATTERN_IDS).toContain(randomPausePatternId(() => 0.999));
  });

  it('unknown ids fall back instead of crashing', () => {
    expect(renderPausePattern('nope')).toEqual(renderPausePattern(PAUSE_PATTERN_IDS[0]!));
  });
});

describe('isPaused', () => {
  const base: BoardConfig = { rotation: { frequencySeconds: 30 }, slides: [] };
  const now = new Date('2026-07-14T12:00:00Z');

  it('is false without a pause or when expired', () => {
    expect(isPaused(base, now)).toBe(false);
    expect(
      isPaused({ ...base, pause: { until: '2026-07-14T11:59:00Z', patternId: 'plus' } }, now),
    ).toBe(false);
  });

  it('is true while until is in the future', () => {
    expect(
      isPaused({ ...base, pause: { until: '2026-07-14T12:30:00Z', patternId: 'plus' } }, now),
    ).toBe(true);
  });
});
