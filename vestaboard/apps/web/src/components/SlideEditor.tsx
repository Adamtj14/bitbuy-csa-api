import {
  ClockSlideConfig,
  Grid,
  League,
  Market,
  NewsSlideConfig,
  Slide,
  SlideTypeConfig,
  SportsSlideConfig,
  TickerSlideConfig,
  TransitionStrategy,
  WeatherSlideConfig,
} from '@vestaboard/core';
import { PainterCanvas } from './PainterCanvas.js';
import { TransitionDemo } from './TransitionDemo.js';

const TRANSITIONS: Array<TransitionStrategy | ''> = [
  '', 'column', 'reverse-column', 'edges-to-center', 'row', 'diagonal', 'random',
];

export interface SlideEditorProps {
  slide: Slide;
  /** The slide's currently rendered grid, for the live transition demo. */
  previewGrid?: Grid;
  onChange: (slide: Slide) => void;
}

export function SlideEditor({ slide, previewGrid, onChange }: SlideEditorProps) {
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
      {previewGrid && (
        <div className="transition-inline">
          <TransitionDemo grid={previewGrid} strategy={slide.transition} />
          <span className="hint">
            Live demo of the {slide.transition ?? 'default'} flip.
          </span>
        </div>
      )}
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
      {slide.config.type === 'weather' && (
        <WeatherEditor config={slide.config} onChange={setConfig} />
      )}
      {slide.config.type === 'news' && (
        <NewsEditor config={slide.config} onChange={setConfig} />
      )}
      {slide.config.type === 'sports' && (
        <SportsEditor config={slide.config} onChange={setConfig} />
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

function WeatherEditor({
  config,
  onChange,
}: {
  config: WeatherSlideConfig;
  onChange: (c: SlideTypeConfig) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <label className="field">
        <span>Location name (on board)</span>
        <input
          value={config.locationName}
          onChange={(e) => onChange({ ...config, locationName: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Latitude</span>
        <input
          type="number"
          step="0.0001"
          value={config.latitude}
          onChange={(e) => onChange({ ...config, latitude: Number(e.target.value) })}
        />
      </label>
      <label className="field">
        <span>Longitude</span>
        <input
          type="number"
          step="0.0001"
          value={config.longitude}
          onChange={(e) => onChange({ ...config, longitude: Number(e.target.value) })}
        />
      </label>
      <label className="field">
        <span>Units</span>
        <select
          value={config.units ?? 'metric'}
          onChange={(e) =>
            onChange({ ...config, units: e.target.value as 'metric' | 'imperial' })
          }
        >
          <option value="metric">°C</option>
          <option value="imperial">°F</option>
        </select>
      </label>
      <label className="field">
        <span>Forecast days</span>
        <select
          value={config.forecastDays ?? 3}
          onChange={(e) => onChange({ ...config, forecastDays: Number(e.target.value) })}
        >
          {[0, 1, 2, 3].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function NewsEditor({
  config,
  onChange,
}: {
  config: NewsSlideConfig;
  onChange: (c: SlideTypeConfig) => void;
}) {
  const setFeed = (i: number, value: string) => {
    const feeds = config.feeds.map((f, j) => (j === i ? value : f));
    onChange({ ...config, feeds });
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label className="field">
        <span>Title row (optional)</span>
        <input
          value={config.title ?? ''}
          onChange={(e) => onChange({ ...config, title: e.target.value || undefined })}
        />
      </label>
      <span style={{ fontSize: 13, opacity: 0.8 }}>RSS/Atom feeds (first working one wins)</span>
      {config.feeds.map((feed, i) => (
        <div key={i} style={{ display: 'flex', gap: 8 }}>
          <input
            value={feed}
            style={{ flex: 1 }}
            onChange={(e) => setFeed(i, e.target.value)}
          />
          <button
            disabled={config.feeds.length === 1}
            onClick={() =>
              onChange({ ...config, feeds: config.feeds.filter((_, j) => j !== i) })
            }
          >
            Remove
          </button>
        </div>
      ))}
      <div>
        <button onClick={() => onChange({ ...config, feeds: [...config.feeds, ''] })}>
          Add feed
        </button>
      </div>
    </div>
  );
}

function SportsEditor({
  config,
  onChange,
}: {
  config: SportsSlideConfig;
  onChange: (c: SlideTypeConfig) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <label className="field">
        <span>League</span>
        <select
          value={config.league}
          onChange={(e) => onChange({ ...config, league: e.target.value as League })}
        >
          <option value="nhl">NHL</option>
          <option value="nba">NBA</option>
          <option value="mlb">MLB</option>
          <option value="nfl">NFL</option>
        </select>
      </label>
      <label className="field">
        <span>Pin teams (comma-separated abbrevs)</span>
        <input
          placeholder="TOR, MTL"
          value={(config.teams ?? []).join(', ')}
          onChange={(e) =>
            onChange({
              ...config,
              teams: e.target.value
                .split(',')
                .map((t) => t.trim().toUpperCase())
                .filter(Boolean),
            })
          }
        />
      </label>
    </div>
  );
}
