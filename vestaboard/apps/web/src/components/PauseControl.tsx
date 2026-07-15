import { useState } from 'react';
import { BoardConfig, isPaused, PAUSE_PATTERN_NAMES, randomPausePatternId } from '@vestaboard/core';

const DURATIONS: Array<{ label: string; minutes: number }> = [
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '4 hours', minutes: 240 },
  { label: '6 hours', minutes: 360 },
];

/**
 * Board controls under the live preview: a Pause button that opens a
 * modal for the details (duration + optional BRB overlay), and the
 * standalone sports-mode toggle.
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
  const [open, setOpen] = useState(false);
  const [brb, setBrb] = useState(false);
  const [minutes, setMinutes] = useState(60);
  const paused = isPaused(config, now);

  const startPause = () => {
    onChange({
      pause: {
        until: new Date(now.getTime() + minutes * 60_000).toISOString(),
        patternId: randomPausePatternId(),
        brb: brb || undefined,
      },
    });
    setOpen(false);
  };

  const untilText = config.pause
    ? new Date(config.pause.until).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <div className="pause-control">
      <div className="board-controls">
        {paused ? (
          <>
            <span className="status-pill status-pending">
              Paused until {untilText} · {PAUSE_PATTERN_NAMES[config.pause!.patternId] ?? 'pattern'}
              {config.pause!.brb ? ' · BRB' : ''}
            </span>
            <button onClick={() => onChange({ pause: undefined })}>Resume now</button>
          </>
        ) : (
          <button onClick={() => setOpen(true)}>⏸ Pause updates…</button>
        )}
        <button
          className={`chip mode-chip ${config.sportsMode ? 'chip-on' : ''}`}
          title="Rotate only sports slides"
          onClick={() => onChange({ sportsMode: !config.sportsMode || undefined })}
        >
          🏒 Sports mode{config.sportsMode ? ' · on' : ''}
        </button>
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)} role="presentation">
          <div
            className="modal modal-narrow"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Pause updates"
          >
            <div className="modal-head">
              <h2>Pause updates</h2>
              <button onClick={() => setOpen(false)}>Cancel</button>
            </div>
            <p className="hint" style={{ marginTop: 0 }}>
              The board flips to a randomly chosen pattern and holds it for the
              duration — no slide updates until it ends (or you resume early).
            </p>
            <div className="field">
              <span>Duration</span>
              <div className="chip-grid">
                {DURATIONS.map((d) => (
                  <button
                    key={d.minutes}
                    className={`chip ${minutes === d.minutes ? 'chip-on' : ''}`}
                    onClick={() => setMinutes(d.minutes)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="field checkbox">
              <input type="checkbox" checked={brb} onChange={(e) => setBrb(e.target.checked)} />
              <span>Overlay “BRB” on the pattern</span>
            </label>
            <div className="board-controls">
              <button className="primary" onClick={startPause}>
                Pause for {DURATIONS.find((d) => d.minutes === minutes)?.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
