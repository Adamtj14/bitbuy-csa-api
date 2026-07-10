import {
  ClockSlideConfig,
  Market,
  Slide,
  SlideTypeConfig,
  TickerSlideConfig,
  TransitionStrategy,
} from '@vestaboard/core';
import { PainterCanvas } from './PainterCanvas.js';

const TRANSITIONS: Array<TransitionStrategy | ''> = [
  '', 'column', 'reverse-column', 'edges-to-center', 'row', 'diagonal', 'random',
];

export interface SlideEditorProps {
  slide: Slide;
  onChange: (slide: Slide) => void;
}

export function SlideEditor({ slide, onChange }: SlideEditorProps) {
  const setConfig = (config: SlideTypeConfig) => onChange({ ...slide, config });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label className="field">
        <span>Name</span>
        <input
          value={slide.name}
          onChange={(e) => onChange({ ...slide, name: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Transition (board flip strategy)</span>
        <select
          value={slide.transition ?? ''}
          onChange={(e) =>
            onChange({
              ...slide,
              transition: (e.target.value || undefined) as TransitionStrategy | undefined,
            })
          }
        >
          {TRANSITIONS.map((t) => (
            <option key={t} value={t}>
              {t === '' ? 'default flip' : t}
            </option>
          ))}
        </select>
      </label>
      {slide.config.type === 'clock' && (
        <ClockEditor config={slide.config} onChange={setConfig} />
      )}
      {slide.config.type === 'ticker' && (
        <TickerEditor config={slide.config} onChange={setConfig} />
      )}
      {slide.config.type === 'painter' && (
        <PainterCanvas
          grid={slide.config.grid}
          onChange={(grid) => setConfig({ type: 'painter', grid })}
        />
      )}
    </div>
  );
}

function ClockEditor({
  config,
  onChange,
}: {
  config: ClockSlideConfig;
  onChange: (c: SlideTypeConfig) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <label className="field">
        <span>Style</span>
        <select
          value={config.style}
          onChange={(e) =>
            onChange({ ...config, style: e.target.value as ClockSlideConfig['style'] })
          }
        >
          <option value="big-digital">Big digital</option>
          <option value="digital-date">Digital + date</option>
          <option value="word">Word clock</option>
        </select>
      </label>
      <label className="field">
        <span>Time zone (IANA)</span>
        <input
          placeholder="America/Toronto"
          value={config.timeZone ?? ''}
          onChange={(e) => onChange({ ...config, timeZone: e.target.value || undefined })}
        />
      </label>
      {config.style !== 'word' && (
        <label className="field checkbox">
          <input
            type="checkbox"
            checked={config.hour12 ?? true}
            onChange={(e) => onChange({ ...config, hour12: e.target.checked })}
          />
          <span>12-hour</span>
        </label>
      )}
    </div>
  );
}

function TickerEditor({
  config,
  onChange,
}: {
  config: TickerSlideConfig;
  onChange: (c: SlideTypeConfig) => void;
}) {
  const setSymbol = (i: number, patch: Partial<{ symbol: string; market: Market }>) => {
    const symbols = config.symbols.map((s, j) => (j === i ? { ...s, ...patch } : s));
    onChange({ ...config, symbols });
  };
  const maxRows = config.title ? 5 : 6;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label className="field">
        <span>Title row (optional)</span>
        <input
          value={config.title ?? ''}
          onChange={(e) => onChange({ ...config, title: e.target.value || undefined })}
        />
      </label>
      {config.symbols.map((spec, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={spec.symbol}
            onChange={(e) => setSymbol(i, { symbol: e.target.value.toUpperCase() })}
            style={{ width: 120 }}
          />
          <select
            value={spec.market}
            onChange={(e) => setSymbol(i, { market: e.target.value as Market })}
          >
            <option value="crypto">Crypto (Bitbuy)</option>
            <option value="us">US exchange</option>
            <option value="tmx">TMX (Toronto)</option>
          </select>
          <button
            onClick={() =>
              onChange({ ...config, symbols: config.symbols.filter((_, j) => j !== i) })
            }
          >
            Remove
          </button>
        </div>
      ))}
      <div>
        <button
          disabled={config.symbols.length >= maxRows}
          onClick={() =>
            onChange({
              ...config,
              symbols: [...config.symbols, { symbol: 'BTC/CAD', market: 'crypto' }],
            })
          }
        >
          Add symbol
        </button>
        {config.symbols.length >= maxRows && (
          <span style={{ marginLeft: 8, opacity: 0.7 }}>
            board fits {maxRows} rows{config.title ? ' with a title' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
