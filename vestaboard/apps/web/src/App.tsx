import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  activeSlides,
  blankGrid,
  BoardConfig,
  BoardModel,
  isPaused,
  isSleeping,
  locationKey,
  MIN_FREQUENCY_SECONDS,
  PAUSE_PATTERN_NAMES,
  RenderContext,
  render,
  renderPausePattern,
  rotationSequence,
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
import { api, ApiError, Me, PushStatus } from './api.js';
import { BoardPreview } from './components/BoardPreview.js';
import { LoginPage } from './components/LoginPage.js';
import { AdminPanel } from './components/AdminPanel.js';
import { SlideEditor } from './components/SlideEditor.js';
import { TransitionGallery } from './components/TransitionDemo.js';
import { SettingsPanel } from './components/SettingsPanel.js';
import { ScheduleEditor } from './components/ScheduleEditor.js';
import { ComposeBar, COMPOSE_SLIDE_ID } from './components/ComposeBar.js';
import { PauseControl } from './components/PauseControl.js';
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

/** A live view of what the board is showing. When cloud push is running it
 *  mirrors the board's actual last-pushed grid (auto-refreshing); otherwise
 *  it simulates the rotation locally, blanking during sleep hours. */
function OnAirPreview({
  config,
  ctx,
  board,
}: {
  config: BoardConfig;
  ctx: RenderContext;
  board: PushStatus | null;
}) {
  const model = config.boardModel ?? 'flagship';
  const freqMs = Math.max(config.rotation.frequencySeconds, MIN_FREQUENCY_SECONDS) * 1000;
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => i + 1), freqMs);
    return () => clearInterval(id);
  }, [freqMs]);

  // Cloud push running → show the board's real state, not a simulation.
  if (board?.pushEnabled && board.lastGrid) {
    const pushedAt = board.lastPushAt
      ? new Date(board.lastPushAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : null;
    return (
      <>
        <BoardPreview grid={board.lastGrid} />
        <p className="hint">
          <span className="live-dot" /> Live from the board — “{board.lastPushedSlide ?? '…'}”
          {pushedAt ? ` · flipped at ${pushedAt}` : ''}
          {board.lastError ? ` · ${board.lastError}` : ''}
        </p>
      </>
    );
  }

  const sleeping = isSleeping(config, ctx.now);

  if (isPaused(config, ctx.now)) {
    const pause = config.pause!;
    return (
      <>
        <BoardPreview grid={renderPausePattern(pause.patternId, model, pause.brb ?? false)} />
        <p className="hint">
          Paused — holding “{PAUSE_PATTERN_NAMES[pause.patternId] ?? pause.patternId}” until{' '}
          {new Date(pause.until).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.
        </p>
      </>
    );
  }

  let base = activeSlides(config, ctx.now);
  if (config.sportsMode) {
    const sports = base.filter((s) => s.config.type === 'sports');
    if (sports.length > 0) base = sports;
  }
  const active = rotationSequence(base);

  if (sleeping) {
    return (
      <>
        <BoardPreview grid={blankGrid(model)} />
        <p className="hint">Asleep (sleep hours) — the board is blank right now.</p>
      </>
    );
  }
  if (active.length === 0) {
    return (
      <>
        <BoardPreview grid={blankGrid(model)} />
        <p className="hint">Nothing scheduled to show right now.</p>
      </>
    );
  }
  const slide = active[idx % active.length]!;
  return (
    <>
      <BoardPreview grid={render(slide.config, ctx)} />
      <p className="hint">
        Showing “{slide.name}” · rotates every {Math.round(freqMs / 1000)}s through{' '}
        {active.length} slide{active.length > 1 ? 's' : ''}
        {config.sportsMode ? ' · sports mode' : ''}.
      </p>
    </>
  );
}

type SaveState = 'saved' | 'saving' | 'error';

/** Seconds-per-slide input that can be freely cleared while typing; the
 *  value is clamped and saved on blur (no forced leading zero). */
function FrequencyInput({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (seconds: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <input
      type="number"
      min={MIN_FREQUENCY_SECONDS}
      inputMode="numeric"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const seconds = clampFrequency(Number(draft));
        setDraft(String(seconds));
        if (seconds !== value) onCommit(seconds);
      }}
    />
  );
}

export default function App() {
  const [me, setMe] = useState<Me | null | 'loading'>('loading');
  const [config, setConfig] = useState<BoardConfig | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [error, setError] = useState<string | null>(null);
  const [showTransitions, setShowTransitions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const now = useNow();
  const ctx = usePreviewContext(config, now);
  const [board, setBoard] = useState<PushStatus | null>(null);
  const saveStateRef = useRef<SaveState>('saved');
  saveStateRef.current = saveState;
  // Drag-to-reorder state for the slide list.
  const listRef = useRef<HTMLUListElement>(null);
  const [drag, setDrag] = useState<{ id: string; from: number; to: number; dy: number } | null>(
    null,
  );
  const dragMids = useRef<number[]>([]);
  const dragStartY = useRef(0);

  useEffect(() => {
    api
      .me()
      .then((user) => {
        setMe(user);
        return api.getConfig().then((c) => {
          setConfig(c);
        });
      })
      .catch(() => setMe(null));
  }, []);

  // Keep the app live without refreshes: mirror the board's real state and
  // pick up config changes made elsewhere (another device / admin). Remote
  // config is only applied while local edits are fully saved.
  useEffect(() => {
    if (me === 'loading' || me === null) return;
    let cancelled = false;
    const pollBoard = () =>
      api.getBoard().then((b) => {
        if (!cancelled) setBoard(b);
      }).catch(() => {});
    const pollConfig = () =>
      api.getConfig().then((remote) => {
        if (cancelled || saveStateRef.current !== 'saved') return;
        setConfig((cur) =>
          cur && JSON.stringify(cur) !== JSON.stringify(remote) ? remote : cur,
        );
      }).catch(() => {});
    pollBoard();
    const id = setInterval(() => {
      pollBoard();
      pollConfig();
    }, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [me]);

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
  const selected = slides.find((s) => s.id === selectedId) ?? null;
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

  /** Drop the slide at `from` into slot `to` and renumber the whole list. */
  const commitMove = (from: number, to: number) => {
    if (from === to) return;
    const arr = [...slides];
    const [moved] = arr.splice(from, 1);
    if (!moved) return;
    arr.splice(to, 0, moved);
    const orderOf = new Map(arr.map((s, i) => [s.id, i]));
    adminUpdate((c) => ({
      ...c,
      slides: c.slides.map((s) => ({ ...s, order: orderOf.get(s.id) ?? s.order })),
    }));
  };

  // Pointer-based drag (works for mouse and touch — the handle sets
  // touch-action: none). Row midpoints are measured once at grab time;
  // the hovered slot is whichever midpoint the dragged row is nearest.
  const startDrag = (e: React.PointerEvent<HTMLButtonElement>, id: string, index: number) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const items = listRef.current?.querySelectorAll('li') ?? [];
    dragMids.current = Array.from(items).map((el) => {
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2;
    });
    dragStartY.current = e.clientY;
    setDrag({ id, from: index, to: index, dy: 0 });
  };

  const moveDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const dy = e.clientY - dragStartY.current;
    const y = (dragMids.current[drag.from] ?? 0) + dy;
    let to = drag.from;
    let best = Infinity;
    dragMids.current.forEach((mid, i) => {
      const d = Math.abs(mid - y);
      if (d < best) {
        best = d;
        to = i;
      }
    });
    setDrag((d) => (d ? { ...d, to, dy } : d));
  };

  const endDrag = () => {
    if (!drag) return;
    commitMove(drag.from, drag.to);
    setDrag(null);
  };

  /** While dragging, the grabbed row follows the pointer and the rows it
   *  passes shift one slot to preview the drop. */
  const dragStyle = (id: string, i: number): React.CSSProperties | undefined => {
    if (!drag) return undefined;
    if (id === drag.id) {
      return { transform: `translateY(${drag.dy}px)` };
    }
    const mids = dragMids.current;
    const step = mids.length > 1 ? (mids[1] ?? 0) - (mids[0] ?? 0) : 0;
    if (drag.from < drag.to && i > drag.from && i <= drag.to) {
      return { transform: `translateY(${-step}px)` };
    }
    if (drag.to < drag.from && i >= drag.to && i < drag.from) {
      return { transform: `translateY(${step}px)` };
    }
    return undefined;
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

  const addButtons = isAdmin
    ? ([
        ['clock', '+ Clock'],
        ['worldclock', '+ World clock'],
        ['ticker', '+ Ticker'],
        ['weather', '+ Weather'],
        ['multiweather', '+ Multi-weather'],
        ['news', '+ News'],
        ['sports', '+ Sports'],
        ['message', '+ Message'],
        ['painter', '+ Painter'],
      ] as const)
    : ([['painter', '+ Painter']] as const);

  return (
    <div className="app">
      <div className="topbar">
        <button className="menu-btn" aria-label="Menu" onClick={() => setMenuOpen(true)}>
          ☰
        </button>
        <h1>Vestaboard Studio</h1>
        <span className="save-state">
          {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : 'Saved'}
        </span>
      </div>
      {error && <p className="error">{error}</p>}

      {/* Hidden import picker (triggered from the menu) */}
      <input
        ref={fileInput}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => e.target.files?.[0] && importConfig(e.target.files[0])}
      />

      {/* ---- Hamburger drawer ---- */}
      {menuOpen && (
        <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} role="presentation">
          <nav className="drawer" onClick={(e) => e.stopPropagation()} aria-label="Menu">
            <div className="drawer-head">
              <h2>Menu</h2>
              <button onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            <div className="drawer-user">
              {me.name || me.email} · {me.role}
            </div>

            <button
              className="drawer-item"
              onClick={() => {
                setShowTransitions(true);
                setMenuOpen(false);
              }}
            >
              Transition demos
            </button>
            {isAdmin && (
              <button
                className="drawer-item"
                onClick={() => {
                  setShowSettings(true);
                  setMenuOpen(false);
                }}
              >
                Settings &amp; keys
              </button>
            )}
            <button className="drawer-item" onClick={() => exportConfig(config)}>
              Export slides.json
            </button>
            {isAdmin && (
              <button
                className="drawer-item"
                onClick={() => {
                  fileInput.current?.click();
                  setMenuOpen(false);
                }}
              >
                Import slides.json
              </button>
            )}

            {isAdmin && (
              <section className="drawer-section">
                <h2>Board</h2>
                <label className="field">
                  <span>Model</span>
                  <select
                    value={config.boardModel ?? 'flagship'}
                    onChange={(e) =>
                      adminUpdate((c) => ({ ...c, boardModel: e.target.value as BoardModel }))
                    }
                  >
                    <option value="flagship">Vestaboard (6 x 22)</option>
                    <option value="note">Vestaboard Note (3 x 15)</option>
                  </select>
                </label>
                <label className="field">
                  <span>Seconds per slide</span>
                  <FrequencyInput
                    value={config.rotation.frequencySeconds}
                    onCommit={(seconds) =>
                      adminUpdate((c) => ({ ...c, rotation: { frequencySeconds: seconds } }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Time zone (IANA)</span>
                  <input
                    placeholder="America/Toronto"
                    value={config.timeZone ?? ''}
                    onChange={(e) =>
                      adminUpdate((c) => ({ ...c, timeZone: e.target.value || undefined }))
                    }
                  />
                </label>
                <span className="field-label">Sleep hours</span>
                <ScheduleEditor
                  schedule={config.sleep}
                  onChange={(sleep) => adminUpdate((c) => ({ ...c, sleep }))}
                />
                <p className="hint">
                  Inside this window the board goes blank (no overnight flap wear).
                </p>
              </section>
            )}

            {isAdmin && (
              <section className="drawer-section">
                <AdminPanel me={me} />
              </section>
            )}

            <button
              className="drawer-item danger"
              onClick={() => api.logout().then(() => window.location.reload())}
            >
              Sign out
            </button>
          </nav>
        </div>
      )}

      {/* ---- Modals ---- */}
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

      {/* ---- Focused main: what's live, instant push, what can go up ---- */}
      <main className="home">
        <section className="panel onair">
          <h2>On the board now</h2>
          <OnAirPreview config={config} ctx={ctx} board={board} />
          {isAdmin && (
            <PauseControl
              config={config}
              now={now}
              onChange={(patch) => adminUpdate((c) => ({ ...c, ...patch }))}
            />
          )}
        </section>

        {isAdmin && (
          <ComposeBar
            config={config}
            ctx={ctx}
            onPost={postComposeMessage}
            onClear={clearComposeMessage}
          />
        )}

        <section className="panel">
          <h2>Slides</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            Tap a slide to preview and edit it. {isAdmin ? 'Toggle the checkbox to put it in rotation.' : ''}
          </p>
          <ul className="slide-list" ref={listRef}>
            {slides.map((slide, i) => (
              <li
                key={slide.id}
                className={`${selected?.id === slide.id ? 'selected' : ''} ${
                  drag?.id === slide.id ? 'dragging' : ''
                }`}
                style={dragStyle(slide.id, i)}
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
                <span className="slide-name">
                  {slide.name}
                  {slide.pinned && <span className="pin-badge">📌 pinned</span>}
                </span>
                <span className="slide-actions">
                  {isAdmin && (
                    <>
                      <button
                        className={`pin-btn ${slide.pinned ? 'pin-on' : ''}`}
                        title={slide.pinned ? 'Unpin' : 'Pin — repeat after every slide'}
                        onClick={(e) => { e.stopPropagation(); updateSlide({ ...slide, pinned: !slide.pinned }); }}
                      >
                        📌
                      </button>
                      <button
                        className="drag-handle"
                        title="Drag to reorder"
                        aria-label={`Drag to reorder ${slide.name}`}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => startDrag(e, slide.id, i)}
                        onPointerMove={moveDrag}
                        onPointerUp={endDrag}
                        onPointerCancel={() => setDrag(null)}
                      >
                        ⠿
                      </button>
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
            {addButtons.map(([type, label]) => (
              <button key={type} onClick={() => addSlide(type)}>
                {label}
              </button>
            ))}
          </div>
          {!isAdmin && (
            <p className="hint">
              Members can draw painter slides; an admin enables them on the board.
            </p>
          )}
        </section>
      </main>

      {/* ---- Editor slide-over ---- */}
      {selected && (
        <div
          className="drawer-backdrop right"
          onClick={() => setSelectedId(null)}
          role="presentation"
        >
          <div
            className="editor-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={`Edit ${selected.name}`}
          >
            <div className="drawer-head">
              <h2>{canEdit(selected) ? 'Edit' : 'Preview'} — {selected.name}</h2>
              <button onClick={() => setSelectedId(null)}>Done</button>
            </div>
            <BoardPreview grid={render(selected.config, ctx)} />
            {selected.config.type !== 'painter' && selected.config.type !== 'clock' && (
              <p className="hint">Preview uses sample data; the agent fetches live.</p>
            )}
            {canEdit(selected) ? (
              <SlideEditor
                slide={selected}
                previewGrid={render(selected.config, ctx)}
                canPin={isAdmin}
                onChange={updateSlide}
              />
            ) : (
              <p className="hint">
                Only admins{selected.config.type === 'painter' ? ' or the creator' : ''} can edit
                this slide.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
