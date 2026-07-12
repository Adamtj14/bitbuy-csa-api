import { describe, expect, it } from 'vitest';
import { toAscii } from '../grid.js';
import { renderWorldClock } from './worldclock.js';
import type { WorldClockSlideConfig } from '../types.js';

// 2026-07-11T16:05:00Z → Toronto 12:05 PM, London 5:05 PM, Tokyo 1:05 AM (next day)
const NOW = new Date('2026-07-11T16:05:00Z');

const config: WorldClockSlideConfig = {
  type: 'worldclock',
  zones: [
    { label: 'TORONTO', timeZone: 'America/Toronto' },
    { label: 'LONDON', timeZone: 'Europe/London' },
    { label: 'TOKYO', timeZone: 'Asia/Tokyo' },
  ],
};

describe('renderWorldClock', () => {
  // toAscii adds a top border, so data rows begin at line index 1.
  it('shows one zone per row, label left and time right', () => {
    const grid = renderWorldClock(config, NOW, 'flagship');
    const lines = toAscii(grid).split('\n');
    expect(lines[1]).toContain('TORONTO');
    expect(lines[1]).toContain('12:05 PM');
    expect(lines[2]).toContain('LONDON');
    expect(lines[2]).toContain('5:05 PM');
    expect(lines[3]).toContain('TOKYO');
    expect(lines[3]).toContain('1:05 AM');
  });

  it('supports 24-hour display', () => {
    const grid = renderWorldClock({ ...config, hour12: false }, NOW, 'flagship');
    expect(toAscii(grid).split('\n')[2]).toContain('17:05');
  });

  it('caps zones to the Note height and never overflows', () => {
    const grid = renderWorldClock(config, NOW, 'note');
    expect(grid).toHaveLength(3);
    expect(grid.every((r) => r.length === 15)).toBe(true);
  });

  it('shows a message when no zones are configured', () => {
    const grid = renderWorldClock({ type: 'worldclock', zones: [] }, NOW);
    expect(toAscii(grid)).toContain('NO TIME ZONES');
  });
});
