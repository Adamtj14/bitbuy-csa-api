import { useEffect, useMemo, useState } from 'react';
import {
  Grid,
  maxStep,
  transitionSteps,
  TransitionStrategy,
  TRANSITION_LABELS,
  TRANSITION_STRATEGIES,
} from '@vestaboard/core';
import { BoardPreview } from './BoardPreview.js';

/** How long the wipe across the board takes, regardless of strategy. */
const WIPE_MS = 1100;
const FLAP_MS = 300;
const PAUSE_MS = 900;

/** All zero → every cell flaps at once (the board's default, non-strategy flip). */
function simultaneousSteps(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
}

export interface TransitionDemoProps {
  grid: Grid;
  /** Omit for the default (all-at-once) flip. */
  strategy?: TransitionStrategy;
}

/**
 * Loops a board transition: the cells flap into place in the strategy's
 * order, pause, then replay. Remounting BoardPreview (via `runId` key)
 * restarts the CSS flap animation each cycle.
 */
export function TransitionDemo({ grid, strategy }: TransitionDemoProps) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 22;
  const steps = useMemo(
    () => (strategy ? transitionSteps(strategy, rows, cols) : simultaneousSteps(rows, cols)),
    [strategy, rows, cols],
  );
  const unitMs = useMemo(() => WIPE_MS / Math.max(1, maxStep(steps)), [steps]);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const period = WIPE_MS + FLAP_MS + PAUSE_MS;
    const id = setInterval(() => setRunId((n) => n + 1), period);
    return () => clearInterval(id);
  }, []);

  return (
    <BoardPreview
      key={runId}
      grid={grid}
      flipSteps={steps}
      flipUnitMs={unitMs}
      flipDurationMs={FLAP_MS}
    />
  );
}

/** A labeled grid of every transition animating on the same sample board. */
export function TransitionGallery({ grid }: { grid: Grid }) {
  const cards: Array<{ key: string; label: string; strategy?: TransitionStrategy }> = [
    { key: 'default', label: 'Default flip (all at once)', strategy: undefined },
    ...TRANSITION_STRATEGIES.map((s) => ({ key: s, label: TRANSITION_LABELS[s], strategy: s })),
  ];
  return (
    <div className="transition-gallery">
      {cards.map((card) => (
        <figure key={card.key} className="transition-card">
          <TransitionDemo grid={grid} strategy={card.strategy} />
          <figcaption>{card.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}
