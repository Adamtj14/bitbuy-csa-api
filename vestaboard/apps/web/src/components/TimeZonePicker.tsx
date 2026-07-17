import { useEffect, useState } from 'react';
import { safeTimeZone } from '@vestaboard/core';

/** Every IANA zone the browser knows, grouped by region for the dropdown. */
const ZONES: string[] =
  typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];

const GROUPS = ZONES.reduce<Map<string, string[]>>((map, zone) => {
  const region = zone.includes('/') ? zone.split('/')[0]! : 'Other';
  map.set(region, [...(map.get(region) ?? []), zone]);
  return map;
}, new Map());

/** "7:31 PM" in the zone right now — the proof the pick is correct. */
function nowIn(timeZone: string): string | null {
  if (!safeTimeZone(timeZone)) return null;
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date());
}

/**
 * A dropdown of real IANA time zones with a live clock beside it, so a
 * pick verifies itself. Blank stays allowed (inherit / default) via
 * `blankLabel`. Falls back to a text input on very old browsers.
 */
export function TimeZonePicker({
  value,
  onChange,
  blankLabel,
}: {
  value?: string;
  onChange: (timeZone?: string) => void;
  blankLabel?: string;
}) {
  // Tick each half-minute so the live preview stays current.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (ZONES.length === 0) {
    return (
      <input
        placeholder="e.g. America/Toronto"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    );
  }

  const known = value === undefined || ZONES.includes(value);
  const preview = value ? nowIn(value) : null;
  return (
    <span className="tz-picker">
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">{blankLabel ?? '— pick a time zone —'}</option>
        {!known && value !== undefined && <option value={value}>{value} (unrecognized)</option>}
        {[...GROUPS.entries()].map(([region, zones]) => (
          <optgroup key={region} label={region}>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone.includes('/') ? zone.slice(zone.indexOf('/') + 1).replaceAll('_', ' ') : zone}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {preview && <span className="tz-now">now {preview}</span>}
    </span>
  );
}
