import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BoardConfig,
  MIN_FREQUENCY_SECONDS,
  Quote,
  render,
  Slide,
  SymbolSpec,
} from '@vestaboard/core';
import { MockProvider } from '@vestaboard/data';
import { BoardPreview } from './components/BoardPreview.js';
import { SlideEditor } from './components/SlideEditor.js';
import {
  clampFrequency,
  exportConfig,
  loadConfig,
  newSlide,
  saveConfig,
} from './state.js';

const mockProvider = new MockProvider();

/** Re-render previews each minute so clock slides stay current. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useMockQuotes(config: BoardConfig): Quote[] {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const specs = useMemo(
    () =>
      config.slides.flatMap((s): SymbolSpec[] =>
        s.config.type === 'ticker' ? s.config.symbols : [],
      ),
    [config],
  );
  const specsKey = JSON.stringify(specs);
  useEffect(() => {
    let cancelled = false;
    mockProvider.getQuotes(specs).then((q) => {
      if (!cancelled) setQuotes(q);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specsKey]);
  return quotes;
}

export default function App() {
  const [config, setConfig] = useState<BoardConfig>(loadConfig);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => loadConfig().slides[0]?.id ?? null,
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const now = useNow();
  const quotes = useMockQuotes(config);

  useEffect(() => saveConfig(config), [config]);

  const slides = [...config.slides].sort((a, b) => a.order - b.order);
  const selected = slides.find((s) => s.id === selectedId) ?? slides[0] ?? null;

  const update = (patch: Partial<BoardConfig>) => setConfig((c) => ({ ...c, ...patch }));

  const updateSlide = (slide: Slide) =>
    update({ slides: config.slides.map((s) => (s.id === slide.id ? slide : s)) });

  const addSlide = (type: Slide['config']['type']) => {
    const slide = newSlide(type, slides.length + 1);
    update({ slides: [...config.slides, slide] });
    setSelectedId(slide.id);
  };

  const removeSlide = (id: string) => {
    update({ slides: config.slides.filter((s) => s.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = slides.findIndex((s) => s.id === id);
    const other = slides[idx + dir];
    if (!other) return;
    const me = slides[idx]!;
    update({
      slides: config.slides.map((s) =>
        s.id === me.id ? { ...s, order: other.order } : s.id === other.id ? { ...s, order: me.order } : s,
      ),
    });
  };

  const importConfig = (file: File) => {
    file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as BoardConfig;
        if (!Array.isArray(parsed.slides)) throw new Error('missing slides');
        setConfig(parsed);
        setSelectedId(parsed.slides[0]?.id ?? null);
      } catch (err) {
        alert(`Could not import: ${String(err)}`);
      }
    });
  };

  return (
    <div className="app">
      <header>
        <h1>Vestaboard Studio</h1>
        <div className="header-actions">
          <button onClick={() => exportConfig(config)}>Export slides.json</button>
          <button onClick={() => fileInput.current?.click()}>Import</button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => e.target.files?.[0] && importConfig(e.target.files[0])}
          />
        </div>
      </header>

      <div className="columns">
        <aside>
          <section className="panel">
            <h2>Rotation</h2>
            <label className="field">
              <span>Seconds per slide</span>
              <input
                type="number"
                min={MIN_FREQUENCY_SECONDS}
                value={config.rotation.frequencySeconds}
                onChange={(e) =>
                  update({ rotation: { frequencySeconds: Number(e.target.value) } })
                }
                onBlur={(e) =>
                  update({
                    rotation: { frequencySeconds: clampFrequency(Number(e.target.value)) },
                  })
                }
              />
            </label>
            <p className="hint">
              The board's flaps need ~{MIN_FREQUENCY_SECONDS}s between messages, so
              rotation can't go faster than that.
            </p>
          </section>

          <section className="panel">
            <h2>Slides</h2>
            <ul className="slide-list">
              {slides.map((slide, i) => (
                <li
                  key={slide.id}
                  className={selected?.id === slide.id ? 'selected' : ''}
                  onClick={() => setSelectedId(slide.id)}
                >
                  <input
                    type="checkbox"
                    checked={slide.enabled}
                    title="Show in rotation"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateSlide({ ...slide, enabled: e.target.checked })}
                  />
                  <div className="thumb">
                    <BoardPreview
                      grid={render(slide.config, { now, quotes })}
                      scale="thumbnail"
                    />
                  </div>
                  <span className="slide-name">{slide.name}</span>
                  <span className="slide-actions">
                    <button disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(slide.id, -1); }}>↑</button>
                    <button disabled={i === slides.length - 1} onClick={(e) => { e.stopPropagation(); move(slide.id, 1); }}>↓</button>
                    <button onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}>✕</button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="add-buttons">
              <button onClick={() => addSlide('clock')}>+ Clock</button>
              <button onClick={() => addSlide('ticker')}>+ Ticker</button>
              <button onClick={() => addSlide('painter')}>+ Painter</button>
            </div>
          </section>
        </aside>

        <main>
          {selected ? (
            <>
              <section className="panel">
                <h2>Preview — {selected.name}</h2>
                <BoardPreview grid={render(selected.config, { now, quotes })} />
                {selected.config.type === 'ticker' && (
                  <p className="hint">Preview uses sample quotes; the agent fetches live data.</p>
                )}
              </section>
              <section className="panel">
                <h2>Edit</h2>
                <SlideEditor slide={selected} onChange={updateSlide} />
              </section>
            </>
          ) : (
            <section className="panel">
              <p>Add a slide to get started.</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
