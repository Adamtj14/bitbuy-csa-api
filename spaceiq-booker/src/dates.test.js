// Run with: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseWeekdays,
  dateKey,
  addDays,
  targetDatesInWindow,
  newlyOpenedDate,
} from './dates.js';

test('parseWeekdays accepts short and long, mixed case', () => {
  const s = parseWeekdays(['Mon', 'tuesday', 'THU']);
  assert.deepEqual([...s].sort(), [1, 2, 4]);
});

test('parseWeekdays rejects garbage', () => {
  assert.throws(() => parseWeekdays(['funday']), /Unrecognized weekday/);
});

test('dateKey formats local YYYY-MM-DD with padding', () => {
  assert.equal(dateKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(dateKey(new Date(2026, 11, 31)), '2026-12-31');
});

test('addDays crosses month boundaries', () => {
  assert.equal(dateKey(addDays(new Date(2026, 0, 30), 3)), '2026-02-02');
});

test('targetDatesInWindow returns matching weekdays within horizon', () => {
  // 2026-08-10 is a Monday; horizon 14 reaches Mon 2026-08-24 inclusive.
  const today = new Date(2026, 7, 10);
  const tueThu = parseWeekdays(['Tue', 'Thu']);
  const dates = targetDatesInWindow(today, 14, tueThu).map(dateKey);
  assert.deepEqual(dates, [
    '2026-08-11', // Tue
    '2026-08-13', // Thu
    '2026-08-18', // Tue
    '2026-08-20', // Thu
    // Tue 2026-08-25 is day 15 — outside the 14-day horizon.
  ]);
});

test('targetDatesInWindow horizon boundary is inclusive', () => {
  // Monday + 14 days = Monday 2026-08-24. Target Mondays -> today and +14 both in.
  const today = new Date(2026, 7, 10);
  const mondays = parseWeekdays(['Mon']);
  assert.deepEqual(targetDatesInWindow(today, 14, mondays).map(dateKey), [
    '2026-08-10',
    '2026-08-17',
    '2026-08-24',
  ]);
});

test('targetDatesInWindow can exclude today', () => {
  const today = new Date(2026, 7, 10); // Monday
  const mondays = parseWeekdays(['Mon']);
  assert.deepEqual(
    targetDatesInWindow(today, 14, mondays, { includeToday: false }).map(dateKey),
    ['2026-08-17', '2026-08-24'],
  );
});

test('newlyOpenedDate returns the +horizon day only when it matches', () => {
  const today = new Date(2026, 7, 10); // Monday; +14 = Monday 08-24
  assert.equal(dateKey(newlyOpenedDate(today, 14, parseWeekdays(['Mon']))), '2026-08-24');
  assert.equal(newlyOpenedDate(today, 14, parseWeekdays(['Tue'])), null);
});
