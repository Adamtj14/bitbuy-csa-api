import { useState } from 'react';
import { BoardConfig, isPaused, PAUSE_PATTERN_NAMES, randomPausePatternId } from '@vestaboard/core';

const DURATIONS: Array<{ label: string; minutes: number }> = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
  { label: '6h', minutes: 360 },
];

/**
 * Pause updates: pick a duration and the board flips to a random pattern
 * (optional BRB overlay, off by default) until the time is up. Also hosts
 * the sports-mode toggle.
 */
export function PauseControl({
  config,
  now,
  onChange,
}: {
  config: BoardConfig;
  now: Date;
  onChange: (patch: Partial<BoardConfig>) => void;
}) {
  const [brb, setBrb] = useState(false);
  const paused = isPaused(config, now);

  const startPause = (minutes: number) =>
    onChange({
      pause: {
        until: new Date(now.getTime() + minutes * 60_000).toISOString(),
        patternId: randomPausePatternId(),
        brb: brb || undefined,
      },
    });

  const untilText = config.pause
    ? new Date(config.pause.until).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <div className="pause-control">
      {paused ? (
        <div className="pause-active">
          <span className="status-pill status-pending">
            Paused until {untilText} · {PAUSE_PATTERN_NAMES[config.pause!.patternId] ?? 'pattern'}
            {config.pause!.brb ? ' · BRB' : ''}
          </span>
          <button onClick={() => onChange({ pause: undefined })}>Resume now</button>
        </div>
      ) : (
        <div className="pause-row">
          <span className="pause-label">Pause updates</span>
          {DURATIONS.map((d) => (
            <button key={d.minutes} onClick={() => startPause(d.minutes)}>
              {d.label}
            </button>
          ))}
          <label className="field checkbox" style={{ margin: 0 }}>
            <input type="checkbox" checked={brb} onChange={(e) => setBrb(e.target.checked)} />
            <span>show “BRB”</span>
          </label>
        </div>
      )}
      <label className="field checkbox" style={{ margin: 0 }}>
        <input
          type="checkbox"
          checked={config.sportsMode ?? false}
          onChange={(e) => onChange({ sportsMode: e.target.checked || undefined })}
        />
        <span>🏒 Sports mode — rotate only sports slides</span>
      </label>
    </div>
  );
}
