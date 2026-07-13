import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BoardConfig,
  BoardModel,
  locationKey,
  MIN_FREQUENCY_SECONDS,
  RenderContext,
  render,
  Slide,
  SymbolSpec,
  WeatherData,
} from '@vestaboard/core';
import {
  MOCK_NEWS,
  MOCK_WEATHER,
  mockGames,
  MockProvider,
} from '@vestaboard/data';
import { api, ApiError, Me } from './api.js';
import { BoardPreview } from './components/BoardPreview.js';
import { LoginPage } from './components/LoginPage.js';
import { AdminPanel } from './components/AdminPanel.js';
import { SlideEditor } from './components/SlideEditor.js';
import { TransitionGallery } from './components/TransitionDemo.js';
import { SettingsPanel } from './components/SettingsPanel.js';
import { ScheduleEditor } from './components/ScheduleEditor.js';
import { ComposeBar, COMPOSE_SLIDE_ID } from './components/ComposeBar.js';
import { clampFrequency, exportConfig, newSlide, sampleGrid } from './state.js';

const mockProvider = new MockProvider();

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Sample data so every preview renders offline; the agent fetches live. */
function usePreviewContext(config: BoardConfig | null, now: Date): RenderContext {
  const model = config?.boardModel ?? 'flagship';
  const [quotes, setQuotes] = useState<RenderContext['quotes']>([]);
  const specs = useMemo(
    () =>
      (config?.slides ?? []).flatMap((s): SymbolSpec[] =>
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
  const games = useMemo(
    () => (['nhl', 'nba', 'mlb', 'nfl'] as const).flatMap((l) => mockGames(l)),
    [],
  );
  // Sample weather for every multi-weather location so previews render offline.
  const weatherByLocation = useMemo(() => {
    const map: Record<string, WeatherData> = {};
    for (const slide of config?.slides ?? []) {
      if (slide.config.type === 'multiweather') {
        for (const loc of slide.config.locations) map[locationKey(loc)] = MOCK_WEATHER;
      }
    }
    return map;
  }, [config]);
  return {
    now,
    model,
    quotes,
    weather: MOCK_WEATHER,
    weatherByLocation,
    news: MOCK_NEWS,
    newsDigest: [
      'RATE CUT EXPECTED THIS FALL',
      'NEW WATERFRONT TRAIL OPENS',
      'CHIP MAKER BEATS FORECASTS',
    ],
    games,
  };
}

type SaveState = 'saved' | 'saving' | 'error';

export default function App() {
  const [me, setMe] = useState<Me | null | 'loading'>('loading');
  const [config, setConfig] = useState<BoardConfig | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [error, setError] = useState<string | null>(null);
  const [showTransitions, setShowTransitions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const now = useNow();
  const ctx = usePreviewContext(config, now);

  useEffect(() => {
    api
      .me()
      .then((user) => {
        setMe(user);
        return api.getConfig().then((c) => {
          setConfig(c);
          setSelectedId(c.slides[0]?.id ?? null);
        });
      })
      .catch(() => setMe(null));
  }, []);

  const isAdmin = me !== 'loading' && me !== null && me.role === 'admin';

  const fail = (err: unknown) => {
    setError(err instanceof ApiError ? err.message : String(err));
    setSaveState('error');
  };

  /** Admin edits: update locally, then debounce a full-document save. */
  const adminUpdate = useCallback((updater: (c: BoardConfig) => BoardConfig) => {
    setConfig((current) => {
      if (!current) return current;
      const next = updater(current);
      setSaveState('saving');
      setError(null);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        api
          .putConfig(next)
          .then(() => setSaveState('saved'))
          .catch(fail);
      }, 600);
      return next;
    });
  }, []);

  if (me === 'loading') return <div className="app">Loading…</div>;
  if (me === null) return <LoginPage />;
  if (!config) return <div className="app">Loading config…</div>;

  const slides = [...config.slides].sort((a, b) => a.order - b.order);
  const selected = slides.find((s) => s.id === selectedId) ?? slides[0] ?? null;
  const canEdit = (slide: Slide) =>
    isAdmin || (slide.createdBy === me.id && slide.config.type === 'painter');

  const updateSlide = (slide: Slide) => {
    if (isAdmin) {
      adminUpdate((c) => ({
        ...c,
        slides: c.slides.map((s) => (s.id === slide.id ? slide : s)),
      }));
    } else {
      setConfig((c) =>
        c ? { ...c, slides: c.slides.map((s) => (s.id === slide.id ? slide : s)) } : c,
      );
      setSaveState('saving');
      api
        .updateSlide(slide)
        .then(() => setSaveState('saved'))
        .catch(fail);
    }
  };

  const addSlide = (type: Slide['config']['type']) => {
    const slide = {
      ...newSlide(type, slides.length + 1, config.boardModel ?? 'flagship'),
      createdBy: me.id,
    };
    if (isAdmin) {
      adminUpdate((c) => ({ ...c, slides: [...c.slides, slide] }));
      setSelectedId(slide.id);
    } else {
      setSaveState('saving');
      api
        .createSlide(slide)
        .then((created) => {
          setConfig((c) => (c ? { ...c, slides: [...c.slides, created] } : c));
          setSelectedId(created.id);
          setSaveState('saved');
        })
        .catch(fail);
    }
  };

  const removeSlide = (id: string) => {
    if (isAdmin) {
      adminUpdate((c) => ({ ...c, slides: c.slides.filter((s) => s.id !== id) }));
    } else {
      setSaveState('saving');
      api
        .deleteSlide(id)
        .then(() => {
          setConfig((c) => (c ? { ...c, slides: c.slides.filter((s) => s.id !== id) } : c));
          setSaveState('saved');
        })
        .catch(fail);
    }
    if (selectedId === id) setSelectedId(null);
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = slides.findIndex((s) => s.id === id);
    const other = slides[idx + dir];
    const mine = slides[idx];
    if (!other || !mine) return;
    adminUpdate((c) => ({
      ...c,
      slides: c.slides.map((s) =>
        s.id === mine.id
          ? { ...s, order: other.order }
          : s.id === other.id
            ? { ...s, order: mine.order }
            : s,
      ),
    }));
  };

  const importConfig = (file: File) => {
    file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as BoardConfig;
        if (!Array.isArray(parsed.slides)) throw new Error('missing slides');
        setSaveState('saving');
        api
          .putConfig(parsed)
          .then((saved) => {
            setConfig(saved);
            setSelectedId(saved.slides[0]?.id ?? null);
            setSaveState('saved');
          })
          .catch(fail);
      } catch (err) {
        setError(`Could not import: ${String(err)}`);
      }
    });
  };

  const postComposeMessage = (text: string) => {
    adminUpdate((c) => {
      const others = c.slides.filter((s) => s.id !== COMPOSE_SLIDE_ID);
      const minOrder = Math.min(1, ...others.map((s) => s.order)) - 1;
      return {
        ...c,
        slides: [
          ...others,
          {
            id: COMPOSE_SLIDE_ID,
            name: 'Message',
            enabled: true,
            order: minOrder,
            config: { type: 'message' as const, text },
            createdBy: me.id,
          },
        ],
      };
    });
  };

  const clearComposeMessage = () =>
    adminUpdate((c) => ({ ...c, slides: c.slides.filter((s) => s.id !== COMPOSE_SLIDE_ID) }));

  return (
    <div className="app">
      <header>
        <h1>Vestaboard Studio</h1>
        <div className="header-actions">
          <span className="save-state">
            {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : 'Saved'}
          </span>
          <button onClick={() => setShowTransitions(true)}>Transition demos</button>
          {isAdmin && <button onClick={() => setShowSettings(true)}>Settings</button>}
          <button onClick={() => exportConfig(config)}>Export slides.json</button>
          {isAdmin && (
            <>
              <button onClick={() => fileInput.current?.click()}>Import</button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => e.target.files?.[0] && importConfig(e.target.files[0])}
              />
            </>
          )}
          <span className="whoami">
            {me.name || me.email} · {me.role}
          </span>
          <button
            onClick={() => api.logout().then(() => window.location.reload())}
          >
            Sign out
          </button>
        </div>
      </header>
      {error && <p className="error">{error}</p>}

      {isAdmin && (
        <ComposeBar
          config={config}
          ctx={ctx}
          onPost={postComposeMessage}
          onClear={clearComposeMessage}
        />
      )}

      {showTransitions && (
        <div
          className="modal-backdrop"
          onClick={() => setShowTransitions(false)}
          role="presentation"
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Transition demos"
          >
            <div className="modal-head">
              <h2>Transition demos</h2>
              <button onClick={() => setShowTransitions(false)}>Close</button>
            </div>
            <p className="hint">
              How the board flips to each slide. Set a slide's strategy in its editor;
              the board firmware performs the real flip. Shown for the{' '}
              {config.boardModel === 'note' ? 'Vestaboard Note' : 'Vestaboard'}.
            </p>
            <TransitionGallery grid={sampleGrid(config.boardModel ?? 'flagship')} />
          </div>
        </div>
      )}

      {showSettings && isAdmin && (
        <div
          className="modal-backdrop"
          onClick={() => setShowSettings(false)}
          role="presentation"
        >
          <div
            className="modal modal-narrow"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Settings"
          >
            <div className="modal-head">
              <h2>Settings</h2>
              <button onClick={() => setShowSettings(false)}>Close</button>
            </div>
            <SettingsPanel />
          </div>
        </div>
      )}

      <div className="columns">
        <aside>
          <section className="panel">
            <h2>Board</h2>
            <label className="field">
              <span>Model</span>
              <select
                disabled={!isAdmin}
                value={config.boardModel ?? 'flagship'}
                onChange={(e) =>
                  adminUpdate((c) => ({ ...c, boardModel: e.target.value as BoardModel }))
                }
              >
                <option value="flagship">Vestaboard (6 x 22)</option>
                <option value="note">Vestaboard Note (3 x 15)</option>
              </select>
            </label>
            <p className="hint">
              Previews, the painter and the agent all render for this model. Painter
              slides drawn for one model show blank on the other.
            </p>
            <h2 style={{ marginTop: 16 }}>Rotation</h2>
            <label className="field">
              <span>Seconds per slide</span>
              <input
                type="number"
                min={MIN_FREQUENCY_SECONDS}
                disabled={!isAdmin}
                value={config.rotation.frequencySeconds}
                onChange={(e) =>
                  adminUpdate((c) => ({
                    ...c,
                    rotation: { frequencySeconds: Number(e.target.value) },
                  }))
                }
                onBlur={(e) =>
                  adminUpdate((c) => ({
                    ...c,
                    rotation: { frequencySeconds: clampFrequency(Number(e.target.value)) },
                  }))
                }
              />
            </label>
            <p className="hint">
              The board's flaps need ~{MIN_FREQUENCY_SECONDS}s between messages, so
              rotation can't go faster than that.
            </p>

            <h2 style={{ marginTop: 16 }}>Time zone</h2>
            <label className="field">
              <span>IANA zone (for schedules &amp; sleep)</span>
              <input
                placeholder="America/Toronto"
                disabled={!isAdmin}
                value={config.timeZone ?? ''}
                onChange={(e) =>
                  adminUpdate((c) => ({ ...c, timeZone: e.target.value || undefined }))
                }
              />
            </label>
            <p className="hint">Blank = the server's local time.</p>

            <h2 style={{ marginTop: 16 }}>Sleep hours</h2>
            {isAdmin && (
              <ScheduleEditor
                schedule={config.sleep}
                onChange={(sleep) => adminUpdate((c) => ({ ...c, sleep }))}
              />
            )}
            <p className="hint">
              Inside this window the board goes blank (no overnight flap wear). Leave
              empty to keep it on 24/7.
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
                    disabled={!isAdmin}
                    title={isAdmin ? 'Show in rotation' : 'Only admins control rotation'}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateSlide({ ...slide, enabled: e.target.checked })}
                  />
                  <div className="thumb">
                    <BoardPreview grid={render(slide.config, ctx)} scale="thumbnail" />
                  </div>
                  <span className="slide-name">{slide.name}</span>
                  <span className="slide-actions">
                    {isAdmin && (
                      <>
                        <button disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(slide.id, -1); }}>↑</button>
                        <button disabled={i === slides.length - 1} onClick={(e) => { e.stopPropagation(); move(slide.id, 1); }}>↓</button>
                      </>
                    )}
                    {canEdit(slide) && (
                      <button onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}>✕</button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="add-buttons">
              {isAdmin ? (
                <>
                  <button onClick={() => addSlide('clock')}>+ Clock</button>
                  <button onClick={() => addSlide('worldclock')}>+ World clock</button>
                  <button onClick={() => addSlide('ticker')}>+ Ticker</button>
                  <button onClick={() => addSlide('weather')}>+ Weather</button>
                  <button onClick={() => addSlide('multiweather')}>+ Multi-weather</button>
                  <button onClick={() => addSlide('news')}>+ News</button>
                  <button onClick={() => addSlide('sports')}>+ Sports</button>
                  <button onClick={() => addSlide('message')}>+ Message</button>
                  <button onClick={() => addSlide('painter')}>+ Painter</button>
                </>
              ) : (
                <button onClick={() => addSlide('painter')}>+ Painter</button>
              )}
            </div>
            {!isAdmin && (
              <p className="hint">
                Members can draw painter slides; an admin enables them on the board.
              </p>
            )}
          </section>

          {isAdmin && <AdminPanel me={me} />}
        </aside>

        <main>
          {selected ? (
            <>
              <section className="panel">
                <h2>Preview — {selected.name}</h2>
                <BoardPreview grid={render(selected.config, ctx)} />
                {selected.config.type !== 'painter' && selected.config.type !== 'clock' && (
                  <p className="hint">Preview uses sample data; the agent fetches live.</p>
                )}
              </section>
              {canEdit(selected) ? (
                <section className="panel">
                  <h2>Edit</h2>
                  <SlideEditor
                    slide={selected}
                    previewGrid={render(selected.config, ctx)}
                    onChange={updateSlide}
                  />
                </section>
              ) : (
                <section className="panel">
                  <p className="hint">
                    Only admins{selected.config.type === 'painter' ? ' or the creator' : ''} can
                    edit this slide.
                  </p>
                </section>
              )}
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
