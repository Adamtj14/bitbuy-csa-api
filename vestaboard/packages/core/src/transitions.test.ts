import { describe, expect, it } from 'vitest';
import {
  maxStep,
  transitionSteps,
  transitionStepsFor,
  TRANSITION_LABELS,
  TRANSITION_STRATEGIES,
} from './transitions.js';

describe('transitionSteps', () => {
  it('column reveals left → right', () => {
    // every cell in a column shares the column index as its wave
    expect(transitionSteps('column', 3, 4)).toEqual([
      [0, 1, 2, 3],
      [0, 1, 2, 3],
      [0, 1, 2, 3],
    ]);
  });

  it('reverse-column reveals right → left', () => {
    expect(transitionSteps('reverse-column', 3, 4)).toEqual([
      [3, 2, 1, 0],
      [3, 2, 1, 0],
      [3, 2, 1, 0],
    ]);
  });

  it('row reveals top → bottom', () => {
    expect(transitionSteps('row', 3, 4)).toEqual([
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [2, 2, 2, 2],
    ]);
  });

  it('edges-to-center meets in the middle', () => {
    expect(transitionSteps('edges-to-center', 1, 6)).toEqual([[0, 1, 2, 2, 1, 0]]);
  });

  it('diagonal sweeps corner to corner', () => {
    expect(transitionSteps('diagonal', 3, 4)).toEqual([
      [0, 1, 2, 3],
      [1, 2, 3, 4],
      [2, 3, 4, 5],
    ]);
  });

  it('random is deterministic and covers every wave', () => {
    const a = transitionSteps('random', 6, 22);
    const b = transitionSteps('random', 6, 22);
    expect(a).toEqual(b); // stable across calls
    // waves span 0..cols-1 with nothing beyond
    expect(maxStep(a)).toBe(21);
    expect(a.every((row) => row.every((v) => v >= 0 && v < 22))).toBe(true);
  });

  it('assigns a wave to every cell for every strategy', () => {
    for (const strategy of TRANSITION_STRATEGIES) {
      const steps = transitionSteps(strategy, 6, 22);
      expect(steps).toHaveLength(6);
      expect(steps.every((row) => row.length === 22)).toBe(true);
      expect(TRANSITION_LABELS[strategy]).toBeTruthy();
    }
  });

  it('transitionStepsFor sizes to the board model', () => {
    expect(transitionStepsFor('column', 'note')).toHaveLength(3);
    expect(transitionStepsFor('column', 'note')[0]).toHaveLength(15);
    expect(transitionStepsFor('column', 'flagship')[0]).toHaveLength(22);
  });
});
