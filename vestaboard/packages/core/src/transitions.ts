import { BoardModel, dimsOf } from './grid.js';
import { TransitionStrategy } from './types.js';

/** All board-supported transition strategies, in display order. */
export const TRANSITION_STRATEGIES: TransitionStrategy[] = [
  'column',
  'reverse-column',
  'edges-to-center',
  'row',
  'diagonal',
  'random',
];

/** Human-friendly labels for the UI. */
export const TRANSITION_LABELS: Record<TransitionStrategy, string> = {
  column: 'Column (left → right)',
  'reverse-column': 'Reverse column (right → left)',
  'edges-to-center': 'Edges to center',
  row: 'Row (top → bottom)',
  diagonal: 'Diagonal',
  random: 'Random',
};

/** Deterministic PRNG (mulberry32) so the random strategy is stable. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stepAt(
  strategy: Exclude<TransitionStrategy, 'random'>,
  r: number,
  c: number,
  cols: number,
): number {
  switch (strategy) {
    case 'column':
      return c;
    case 'reverse-column':
      return cols - 1 - c;
    case 'row':
      return r;
    case 'edges-to-center':
      return Math.min(c, cols - 1 - c);
    case 'diagonal':
      return r + c;
  }
}

function randomSteps(rows: number, cols: number): number[][] {
  const n = rows * cols;
  const order: number[] = Array.from({ length: n }, (_, i) => i);
  const rand = mulberry32(0x5eed);
  // Fisher–Yates shuffle for a stable, even scatter.
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = order[i]!;
    order[i] = order[j]!;
    order[j] = tmp;
  }
  const rank = new Array<number>(n);
  order.forEach((cell, position) => {
    rank[cell] = position;
  });
  const waves = cols; // reveal in ~cols waves, like the other strategies
  const grid: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const line: number[] = [];
    for (let c = 0; c < cols; c++) {
      const position = rank[r * cols + c] ?? 0;
      line.push(Math.floor((position * waves) / n));
    }
    grid.push(line);
  }
  return grid;
}

/**
 * For each cell, the wave index at which it flips during a transition —
 * 0 flips first, higher numbers later. Pure and deterministic, so the
 * web preview animates the same ordering the board firmware uses. The
 * board performs the real flip; this drives our staggered preview.
 */
export function transitionSteps(
  strategy: TransitionStrategy,
  rows: number,
  cols: number,
): number[][] {
  if (strategy === 'random') return randomSteps(rows, cols);
  const grid: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const line: number[] = [];
    for (let c = 0; c < cols; c++) line.push(stepAt(strategy, r, c, cols));
    grid.push(line);
  }
  return grid;
}

/** transitionSteps for a whole board model. */
export function transitionStepsFor(
  strategy: TransitionStrategy,
  model: BoardModel = 'flagship',
): number[][] {
  const { rows, cols } = dimsOf(model);
  return transitionSteps(strategy, rows, cols);
}

/** The last wave index in a step grid (0 for an empty grid). */
export function maxStep(steps: number[][]): number {
  let max = 0;
  for (const row of steps) {
    for (const value of row) {
      if (value > max) max = value;
    }
  }
  return max;
}
