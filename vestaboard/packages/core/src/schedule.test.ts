import { describe, expect, it } from 'vitest';
import { activeSlides, hasSchedule, isActive, isSleeping } from './schedule.js';
import type { BoardConfig, Slide } from './types.js';

// A fixed instant: 2026-07-11T14:30:00Z is Saturday, 10:30 in America/Toronto (EDT).
const SAT_1030 = new Date('2026-07-11T14:30:00Z');

describe('isActive', () => {
  it('treats an empty/absent schedule as always active', () => {
    expect(isActive(undefined, SAT_1030, 'America/Toronto')).toBe(true);
    expect(isActive({}, SAT_1030, 'America/Toronto')).toBe(true);
    expect(hasSchedule({})).toBe(false);
  });

  it('honors a same-day time window', () => {
    expect(isActive({ start: '09:00', end: '12:00' }, SAT_1030, 'America/Toronto')).toBe(true);
    expect(isActive({ start: '11:00', end: '12:00' }, SAT_1030, 'America/Toronto')).toBe(false);
  });

  it('handles an overnight window that wraps midnight', () => {
    // 10:30 is outside 22:00–06:00
    expect(isActive({ start: '22:00', end: '06:00' }, SAT_1030, 'America/Toronto')).toBe(false);
    // 02:00 Toronto (06:00Z) is inside it
    const overnight = new Date('2026-07-11T06:00:00Z');
    expect(isActive({ start: '22:00', end: '06:00' }, overnight, 'America/Toronto')).toBe(true);
  });

  it('filters by day of week (Saturday = 6)', () => {
    expect(isActive({ days: [6] }, SAT_1030, 'America/Toronto')).toBe(true);
    expect(isActive({ days: [1, 2, 3, 4, 5] }, SAT_1030, 'America/Toronto')).toBe(false);
  });

  it('respects the time zone', () => {
    // Same instant is 15:30 in London — inside an afternoon window there.
    expect(isActive({ start: '15:00', end: '16:00' }, SAT_1030, 'Europe/London')).toBe(true);
    expect(isActive({ start: '15:00', end: '16:00' }, SAT_1030, 'America/Toronto')).toBe(false);
  });
});

function slide(id: string, schedule?: Slide['schedule']): Slide {
  return { id, name: id, enabled: true, order: Number(id), config: { type: 'clock', style: 'word' }, schedule };
}

describe('activeSlides + isSleeping', () => {
  const config: BoardConfig = {
    timeZone: 'America/Toronto',
    rotation: { frequencySeconds: 30 },
    slides: [
      slide('1'),
      slide('2', { start: '11:00', end: '12:00' }), // not yet active at 10:30
      { ...slide('3'), enabled: false },
    ],
  };

  it('keeps only enabled, in-schedule slides', () => {
    expect(activeSlides(config, SAT_1030).map((s) => s.id)).toEqual(['1']);
  });

  it('reports sleep only when inside the sleep window', () => {
    expect(isSleeping(config, SAT_1030)).toBe(false);
    const sleeping: BoardConfig = { ...config, sleep: { start: '00:00', end: '11:00' } };
    expect(isSleeping(sleeping, SAT_1030)).toBe(true);
  });
});
