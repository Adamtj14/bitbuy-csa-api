import { describe, expect, it } from 'vitest';
import { toAscii } from '../grid.js';
import { render } from '../render.js';
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

describe('pixel clocks (colour chips as pixels)', () => {
  const COLOR_MIN = 63, COLOR_MAX = 69; // red..white chips
  const chips = (grid: number[][]) =>
    grid.flat().filter((c) => c >= COLOR_MIN && c <= COLOR_MAX);

  it('rainbow: draws chip digits with distinct colours per digit (flagship)', () => {
    const grid = renderClock(
      { type: 'clock', style: 'pixel', ...base },
      at('2026-07-10T16:05:00Z'),
    );
    const used = new Set(chips(grid));
    expect(chips(grid).length).toBeGreaterThan(10);
    expect(used.size).toBeGreaterThanOrEqual(3); // 4:05 -> 3 digits + colon
    // AM/PM label on the bottom row
    expect(grid[5]!.some((c) => c === 16 || c === 1)).toBe(true); // P or A
  });

  it('rainbow: fits the Note with the 3x3 micro font', () => {
    const grid = renderClock(
      { type: 'clock', style: 'pixel', ...base },
      at('2026-07-10T12:59:00Z'),
      {},
      'note',
    );
    expect(grid).toHaveLength(3);
    expect(grid.every((r) => r.length === 15)).toBe(true);
    expect(chips(grid).length).toBeGreaterThan(8); // 4 digits drawn
  });

  it('invert: fills the background and draws white digits', () => {
    const grid = renderClock(
      { type: 'clock', style: 'pixel-invert', ...base },
      at('2026-07-10T16:05:00Z'),
    );
    // hour 16 -> palette[16 % 6 = 4] = blue (67)
    expect(grid[0]![0]).toBe(67);
    expect(grid.flat().filter((c) => c === 69).length).toBeGreaterThan(10); // white digits
    // no blank cells above the AM/PM row
    expect(grid.slice(0, 5).flat().every((c) => c >= COLOR_MIN)).toBe(true);
  });

  it('invert on the Note stays within 15 columns', () => {
    const grid = renderClock(
      { type: 'clock', style: 'pixel-invert', ...base },
      at('2026-07-10T12:59:00Z'),
      {},
      'note',
    );
    expect(grid).toHaveLength(3);
    expect(grid.every((r) => r.length === 15)).toBe(true);
    expect(grid.flat().every((c) => c >= COLOR_MIN && c <= COLOR_MAX)).toBe(true);
  });

  it('is deterministic and changes by the minute', () => {
    const a = renderClock({ type: 'clock', style: 'pixel', ...base }, at('2026-07-10T10:30:00Z'));
    const b = renderClock({ type: 'clock', style: 'pixel', ...base }, at('2026-07-10T10:30:59Z'));
    const c = renderClock({ type: 'clock', style: 'pixel', ...base }, at('2026-07-10T10:31:00Z'));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe('time zone fallback', () => {
  const noon = at('2026-07-10T16:00:00Z'); // 12:00 in Toronto (EDT)

  it('a blank slide zone falls back to the board zone from the context', () => {
    const grid = render(
      { type: 'clock', style: 'digital-date' },
      { now: noon, timeZone: 'America/Toronto' },
    );
    expect(toAscii(grid)).toContain('12:00 PM');
  });

  it("the slide's own zone beats the board zone", () => {
    const grid = render(
      { type: 'clock', style: 'digital-date', timeZone: 'UTC' },
      { now: noon, timeZone: 'America/Toronto' },
    );
    expect(toAscii(grid)).toContain('4:00 PM');
  });
});
