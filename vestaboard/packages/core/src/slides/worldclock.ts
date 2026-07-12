import { blankGrid, BoardModel, dimsOf, Grid } from '../grid.js';
import { encodeLine, writeAt } from '../text.js';
import type { WorldClockSlideConfig } from '../types.js';
import { formatZoneTime } from './clock.js';

/**
 * One time zone per row: label on the left, current time right-aligned.
 * Up to `rows` zones (6 on the flagship, 3 on the Note).
 *
 *   TORONTO          9:05 AM
 *   LONDON           2:05 PM
 *   TOKYO           10:05 PM
 */
export function renderWorldClock(
  config: WorldClockSlideConfig,
  now: Date,
  model: BoardModel = 'flagship',
): Grid {
  const { rows, cols } = dimsOf(model);
  const grid = blankGrid(model);
  const hour12 = config.hour12 ?? true;

  if (config.zones.length === 0) {
    grid[Math.floor(rows / 2)] = encodeLine('NO TIME ZONES', 'center', cols);
    return grid;
  }

  config.zones.slice(0, rows).forEach((zone, i) => {
    const row = grid[i]!;
    const time = formatZoneTime(now, zone.timeZone || undefined, hour12);
    const label = zone.label.slice(0, Math.max(0, cols - time.length - 1));
    writeAt(row, 0, label);
    writeAt(row, cols - time.length, time);
  });
  return grid;
}
