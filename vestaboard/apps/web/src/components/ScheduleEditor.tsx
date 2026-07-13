import { DaySchedule } from '@vestaboard/core';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Day-of-week chips + a from/to time window, editing a DaySchedule. */
export function ScheduleEditor({
  schedule,
  onChange,
}: {
  schedule?: DaySchedule;
  onChange: (schedule: DaySchedule) => void;
}) {
  const s = schedule ?? {};
  const days = new Set(s.days ?? []);
  const toggleDay = (d: number) => {
    const next = new Set(days);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    const arr = [...next].sort((a, b) => a - b);
    onChange({ ...s, days: arr.length ? arr : undefined });
  };
  const setTime = (field: 'start' | 'end', value: string) =>
    onChange({ ...s, [field]: value || undefined });

  return (
    <div className="schedule-editor">
      <div className="chip-grid">
        {DAY_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`chip ${days.has(i) ? 'chip-on' : ''}`}
            onClick={() => toggleDay(i)}
            title={`Toggle ${label}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="schedule-times">
        <label className="field">
          <span>From</span>
          <input type="time" value={s.start ?? ''} onChange={(e) => setTime('start', e.target.value)} />
        </label>
        <label className="field">
          <span>To</span>
          <input type="time" value={s.end ?? ''} onChange={(e) => setTime('end', e.target.value)} />
        </label>
      </div>
    </div>
  );
}
