import { describe, expect, it } from 'vitest';
import { toAscii } from '../grid.js';
import { renderClock } from './clock.js';

// 2026-07-10 14:35 UTC
const at = (iso: string) => new Date(iso);
const base = { timeZone: 'UTC' as const };

describe('word clock', () => {
  const cases: Array<[string, string]> = [
    ['2026-07-10T10:30:00Z', 'IT IS HALF PAST TEN'],
    ['2026-07-10T10:00:00Z', "IT IS TEN O'CLOCK"],
    ['2026-07-10T10:58:00Z', "IT IS ELEVEN O'CLOCK"],
    ['2026-07-10T10:15:00Z', 'IT IS QUARTER PAST TEN'],
    ['2026-07-10T10:45:00Z', 'IT IS QUARTER TO ELEVEN'],
    ['2026-07-10T23:47:00Z', 'IT IS QUARTER TO TWELVE'],
    ['2026-07-10T12:25:00Z', 'IT IS TWENTY FIVE PAST TWELVE'],
    ['2026-07-10T00:02:00Z', "IT IS TWELVE O'CLOCK"],
  ];
  for (const [iso, phrase] of cases) {
    it(`${iso} -> ${phrase}`, () => {
      const ascii = toAscii(
        renderClock({ type: 'clock', style: 'word', ...base }, at(iso)),
      );
      const flattened = ascii
        .split('\n')
        .map((l) => l.replace(/[|+-]/g, '').trim())
        .filter(Boolean)
        .join(' ');
      expect(flattened).toBe(phrase);
    });
  }
});

describe('digital + date', () => {
  it('renders time, weekday and date', () => {
    const grid = renderClock(
      { type: 'clock', style: 'digital-date', ...base },
      at('2026-07-10T14:35:00Z'),
    );
    expect(toAscii(grid)).toMatchInlineSnapshot(`
      "+----------------------+
      |                      |
      |       2:35 PM        |
      |                      |
      |         FRI          |
      |     JUL 10 2026      |
      |                      |
      +----------------------+"
    `);
  });

  it('respects 24h mode', () => {
    const grid = renderClock(
      { type: 'clock', style: 'digital-date', hour12: false, ...base },
      at('2026-07-10T14:35:00Z'),
    );
    expect(toAscii(grid)).toContain('14:35');
  });
});

describe('big digital', () => {
  it('draws 5-row block digits with white chips and AM/PM', () => {
    const grid = renderClock(
      { type: 'clock', style: 'big-digital', ...base },
      at('2026-07-10T14:35:00Z'),
    );
    expect(toAscii(grid)).toMatchInlineSnapshot(`
      "+----------------------+
      |    WWW   WWW WWW     |
      |      W W   W W       |
      |    WWW   WWW WWW     |
      |    W   W   W   W     |
      |    WWW   WWW WWW     |
      |          PM          |
      +----------------------+"
    `);
  });

  it('handles midnight in 12h mode as 12:00 AM', () => {
    const grid = renderClock(
      { type: 'clock', style: 'big-digital', ...base },
      at('2026-07-10T00:00:00Z'),
    );
    expect(toAscii(grid)).toContain('AM');
  });

  it('renders time in another zone', () => {
    const grid = renderClock(
      { type: 'clock', style: 'digital-date', timeZone: 'America/Toronto' },
      at('2026-07-10T14:35:00Z'),
    );
    expect(toAscii(grid)).toContain('10:35 AM');
  });
});
