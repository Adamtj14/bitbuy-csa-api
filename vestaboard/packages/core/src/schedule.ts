import { safeTimeZone } from './tz.js';
import type { BoardConfig, DaySchedule, Slide } from './types.js';

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

interface ZonedParts {
  /** Minutes since midnight, 0–1439. */
  minutes: number;
  /** 0 (Sunday) – 6 (Saturday). */
  weekday: number;
}

function partsInZone(now: Date, timeZone?: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTimeZone(timeZone),
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value]));
  const hour = Number(p.hour) % 24;
  const minute = Number(p.minute);
  return { minutes: hour * 60 + minute, weekday: WEEKDAY_INDEX[p.weekday ?? 'Sun'] ?? 0 };
}

function parseHM(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** True when a schedule has any active constraint (else it means "always"). */
export function hasSchedule(schedule?: DaySchedule): boolean {
  return (
    !!schedule &&
    ((schedule.days?.length ?? 0) > 0 || !!schedule.start || !!schedule.end)
  );
}

/**
 * Whether `now` (in `timeZone`) falls inside the schedule. An empty
 * schedule is always active. A start > end window wraps past midnight.
 */
export function isActive(schedule: DaySchedule | undefined, now: Date, timeZone?: string): boolean {
  if (!hasSchedule(schedule)) return true;
  const { minutes, weekday } = partsInZone(now, timeZone);

  if (schedule!.days && schedule!.days.length > 0 && !schedule!.days.includes(weekday)) {
    return false;
  }

  const start = schedule!.start ? parseHM(schedule!.start) : null;
  const end = schedule!.end ? parseHM(schedule!.end) : null;
  if (start === null && end === null) return true;
  if (start !== null && end === null) return minutes >= start;
  if (start === null && end !== null) return minutes < end;
  // both set
  if (start! <= end!) return minutes >= start! && minutes < end!;
  return minutes >= start! || minutes < end!; // overnight wrap
}

/** Whether the board is in its sleep window right now. */
export function isSleeping(config: BoardConfig, now: Date): boolean {
  return hasSchedule(config.sleep) && isActive(config.sleep, now, config.timeZone);
}

/** Enabled slides that are also within their schedule, in rotation order. */
export function activeSlides(config: BoardConfig, now: Date): Slide[] {
  return config.slides
    .filter((s) => s.enabled && isActive(s.schedule, now, config.timeZone))
    .sort((a, b) => a.order - b.order);
}

/**
 * The play order for the active slides. Pinned slides are pulled out of the
 * regular run and shown after every regular slide, so they appear more often:
 * regulars [1,2,4] + pins [3,5] → [1,3,5, 2,3,5, 4,3,5]. With no pins the order
 * is unchanged; with only pins, just the pins cycle.
 */
export function rotationSequence(active: Slide[]): Slide[] {
  const pinned = active.filter((s) => s.pinned);
  if (pinned.length === 0) return active;
  const regular = active.filter((s) => !s.pinned);
  if (regular.length === 0) return pinned;
  const sequence: Slide[] = [];
  for (const slide of regular) sequence.push(slide, ...pinned);
  return sequence;
}
