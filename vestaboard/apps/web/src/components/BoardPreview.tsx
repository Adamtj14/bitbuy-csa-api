import { CSSProperties, useCallback, useRef } from 'react';
import { codeToChar, COLOR, Grid, isColorCode } from '@vestaboard/core';

const CHIP_COLORS: Record<number, string> = {
  [COLOR.red]: '#d33a2c',
  [COLOR.orange]: '#e07f1f',
  [COLOR.yellow]: '#e6c229',
  [COLOR.green]: '#3a9c4e',
  [COLOR.blue]: '#2a6fd6',
  [COLOR.violet]: '#7a4dd8',
  [COLOR.white]: '#e8e6e1',
  [COLOR.black]: '#0c0c0c',
  [COLOR.filled]: '#e8e6e1',
};

export interface BoardPreviewProps {
  grid: Grid;
  /** Tile size in px; the board scales to fit its container by default. */
  scale?: 'thumbnail' | 'full';
  /** When set, cells report pointer painting (click or drag). */
  onPaint?: (row: number, col: number) => void;
  /**
   * Per-cell wave index (from `transitionSteps`). When present, each cell
   * flaps into place staggered by its wave, animating the transition. Remount
   * the component (change its `key`) to replay.
   */
  flipSteps?: number[][];
  /** Delay per wave, in ms. */
  flipUnitMs?: number;
  /** How long a single cell's flap lasts, in ms. */
  flipDurationMs?: number;
}

/**
 * The split-flap board, styled like the physical Vestaboard. Renders
 * whatever shape the grid has (flagship 6x22 or Note 3x15).
 * Reused by the painter (editable), slide editors (live preview) and
 * slide lists (thumbnails) — always fed by the same render() output
 * the agent pushes, so the preview matches the board.
 */
export function BoardPreview({
  grid,
  scale = 'full',
  onPaint,
  flipSteps,
  flipUnitMs = 45,
  flipDurationMs = 280,
}: BoardPreviewProps) {
  const painting = useRef(false);
  const rows = grid.length;
  const cols = grid[0]?.length ?? 22;

  const handlePointerDown = useCallback(
    (row: number, col: number) => {
      if (!onPaint) return;
      painting.current = true;
      onPaint(row, col);
    },
    [onPaint],
  );

  const handlePointerEnter = useCallback(
    (row: number, col: number) => {
      if (!onPaint || !painting.current) return;
      onPaint(row, col);
    },
    [onPaint],
  );

  const boardStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: scale === 'thumbnail' ? 1 : 3,
    padding: scale === 'thumbnail' ? 4 : 12,
    background: '#191919',
    borderRadius: scale === 'thumbnail' ? 4 : 10,
    boxShadow: 'inset 0 0 12px rgba(0,0,0,0.8)',
    width: '100%',
    maxWidth: cols < 22 ? 560 : undefined,
    aspectRatio: `${cols} / ${rows + 1}`,
    userSelect: 'none',
    touchAction: 'none',
    // Make the board a query container so cells size their glyphs to the
    // board's own width (cqw), not the viewport. Keeps characters filling
    // the cell whether the board is full-screen on a phone or in a column.
    containerType: 'inline-size',
    // Depth so the staggered flap animation reads as flaps turning.
    perspective: flipSteps ? '600px' : undefined,
  };

  return (
    <div
      style={boardStyle}
      onPointerUp={() => (painting.current = false)}
      onPointerLeave={() => (painting.current = false)}
      role={onPaint ? 'grid' : 'img'}
      aria-label="Vestaboard preview"
    >
      {grid.flatMap((row, r) =>
        row.map((code, c) => {
          const chip = isColorCode(code) ? CHIP_COLORS[code] : undefined;
          const step = flipSteps?.[r]?.[c];
          const cellStyle: CSSProperties = {
            position: 'relative',
            borderRadius: 2,
            background: chip ?? '#232323',
            color: '#f0ede6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Roboto Mono", ui-monospace, monospace',
            fontWeight: 600,
            fontSize:
              scale === 'thumbnail' ? 5 : `min(${(58 / cols).toFixed(2)}cqw, 20px)`,
            overflow: 'hidden',
            cursor: onPaint ? 'pointer' : 'default',
            aspectRatio: '2 / 3',
            ...(step !== undefined && {
              transformOrigin: 'center',
              animation: `bp-flap ${flipDurationMs}ms ease-out both`,
              animationDelay: `${step * flipUnitMs}ms`,
            }),
          };
          const char = chip ? '' : codeToChar(code);
          return (
            <div
              key={`${r}-${c}`}
              style={cellStyle}
              onPointerDown={() => handlePointerDown(r, c)}
              onPointerEnter={() => handlePointerEnter(r, c)}
            >
              {char === ' ' ? '' : char}
              {/* split-flap seam */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '50%',
                  height: 1,
                  background: 'rgba(0,0,0,0.45)',
                }}
              />
            </div>
          );
        }),
      )}
    </div>
  );
}
