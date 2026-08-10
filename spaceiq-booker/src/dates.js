// Pure date logic for the booking window. No browser, no I/O — fully unit-tested.
//
// SpaceIQ (and most hotelling tools) let you book at most N days ahead. Running
// this daily and, on each run, ensuring every desired weekday inside the
// [today .. today+horizon] window is booked makes the automation self-healing:
// if the laptop was asleep and skipped a day, the next run still catches up on
// anything that is still bookable.

const WEEKDAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Parse weekday names (case-insensitive, e.g. "Mon", "tuesday", "THU") into a
 * Set of JS day numbers (0=Sun .. 6=Sat).
 * @param {string[]} names
 * @returns {Set<number>}
 */
export function parseWeekdays(names) {
  const set = new Set();
  for (const raw of names) {
    const key = String(raw).trim().toLowerCase().slice(0, 3);
    const idx = WEEKDAY_NAMES.indexOf(key);
    if (idx === -1) throw new Error(`Unrecognized weekday: "${raw}"`);
    set.add(idx);
  }
  return set;
}

/**
 * Local-time YYYY-MM-DD key for a date. Uses local time on purpose: bookings are
 * made in the office's / user's local calendar day, not UTC.
 * @param {Date} d
 * @returns {string}
 */
export function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Return a new Date n days after d, normalized to local midnight.
 * @param {Date} d
 * @param {number} n
 * @returns {Date}
 */
export function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/**
 * Every date in [from .. from+horizonDays] (inclusive) whose weekday is in the
 * target set. Dates are returned at local midnight, earliest first.
 *
 * @param {Date} from            typically "today"
 * @param {number} horizonDays   how far ahead booking is allowed (e.g. 14)
 * @param {Set<number>} weekdaySet  JS day numbers to target
 * @param {object} [opts]
 * @param {boolean} [opts.includeToday=true]  whether "today" itself is eligible
 * @returns {Date[]}
 */
export function targetDatesInWindow(from, horizonDays, weekdaySet, opts = {}) {
  const includeToday = opts.includeToday !== false;
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const out = [];
  for (let i = includeToday ? 0 : 1; i <= horizonDays; i++) {
    const d = addDays(start, i);
    if (weekdaySet.has(d.getDay())) out.push(d);
  }
  return out;
}

/**
 * The single day that *just* became bookable on this run: exactly horizonDays
 * ahead, but only if it matches the target weekdays. Returns null otherwise.
 * Useful for a "grab it the moment it opens" run rather than the full sweep.
 * @param {Date} from
 * @param {number} horizonDays
 * @param {Set<number>} weekdaySet
 * @returns {Date|null}
 */
export function newlyOpenedDate(from, horizonDays, weekdaySet) {
  const d = addDays(new Date(from.getFullYear(), from.getMonth(), from.getDate()), horizonDays);
  return weekdaySet.has(d.getDay()) ? d : null;
}
