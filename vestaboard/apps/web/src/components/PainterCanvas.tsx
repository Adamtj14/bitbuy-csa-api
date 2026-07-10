import { useState } from 'react';
import {
  BLANK,
  charToCode,
  cloneGrid,
  codeToChar,
  COLOR,
  ColorName,
  Grid,
  isColorCode,
} from '@vestaboard/core';
import { BoardPreview } from './BoardPreview.js';

type Tool = { kind: 'color'; color: ColorName } | { kind: 'char'; code: number } | { kind: 'erase' };

const PALETTE: ColorName[] = [
  'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'white', 'black', 'filled',
];

const SWATCH: Record<ColorName, string> = {
  red: '#d33a2c', orange: '#e07f1f', yellow: '#e6c229', green: '#3a9c4e',
  blue: '#2a6fd6', violet: '#7a4dd8', white: '#e8e6e1', black: '#0c0c0c',
  filled: '#bdbab3',
};

export interface PainterCanvasProps {
  grid: Grid;
  onChange: (grid: Grid) => void;
}

/** Cell-by-cell editor: pick a color chip or type a character, then paint. */
export function PainterCanvas({ grid, onChange }: PainterCanvasProps) {
  const [tool, setTool] = useState<Tool>({ kind: 'color', color: 'white' });
  const [charInput, setCharInput] = useState('A');

  const paint = (row: number, col: number) => {
    const next = cloneGrid(grid);
    const target = next[row];
    if (!target) return;
    if (tool.kind === 'erase') target[col] = BLANK;
    else if (tool.kind === 'color') target[col] = COLOR[tool.color];
    else target[col] = tool.code;
    onChange(next);
  };

  const selectChar = (value: string) => {
    const ch = value.slice(-1);
    setCharInput(ch);
    const code = charToCode(ch);
    if (code !== BLANK || ch === ' ') setTool({ kind: 'char', code });
  };

  const isActiveColor = (c: ColorName) => tool.kind === 'color' && tool.color === c;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <BoardPreview grid={grid} onPaint={paint} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {PALETTE.map((color) => (
          <button
            key={color}
            title={color}
            onClick={() => setTool({ kind: 'color', color })}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: SWATCH[color],
              border: isActiveColor(color) ? '3px solid #4f8ef7' : '1px solid #555',
              cursor: 'pointer',
            }}
          />
        ))}
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span>Character:</span>
          <input
            value={charInput}
            onChange={(e) => selectChar(e.target.value)}
            onFocus={() => selectChar(charInput)}
            style={{
              width: 36,
              textAlign: 'center',
              padding: 4,
              border: tool.kind === 'char' ? '3px solid #4f8ef7' : '1px solid #555',
              borderRadius: 6,
              background: '#232323',
              color: '#f0ede6',
              fontFamily: 'monospace',
            }}
          />
          {tool.kind === 'char' && <code>paints "{codeToChar(tool.code)}"</code>}
        </label>
        <button
          onClick={() => setTool({ kind: 'erase' })}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: tool.kind === 'erase' ? '3px solid #4f8ef7' : '1px solid #555',
            background: '#232323',
            color: '#f0ede6',
            cursor: 'pointer',
          }}
        >
          Erase
        </button>
        <button
          onClick={() => onChange(grid.map((row) => row.map(() => BLANK)))}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid #555',
            background: '#232323',
            color: '#f0ede6',
            cursor: 'pointer',
          }}
        >
          Clear board
        </button>
      </div>
    </div>
  );
}
