import { useState } from 'react';
import { BoardConfig, dimsOf, render, RenderContext, wrapText } from '@vestaboard/core';
import { BoardPreview } from './BoardPreview.js';

/** Stable id for the single slide the compose box drives. */
export const COMPOSE_SLIDE_ID = 'compose-message';

/**
 * "Message the board" — a compose box pinned at the top of the home
 * screen. Posting upserts one Message slide at the front of the rotation
 * so it shows on the next push; Clear removes it.
 */
export function ComposeBar({
  config,
  ctx,
  onPost,
  onClear,
}: {
  config: BoardConfig;
  ctx: RenderContext;
  onPost: (text: string) => void;
  onClear: () => void;
}) {
  const existing = config.slides.find((s) => s.id === COMPOSE_SLIDE_ID);
  const current = existing && existing.config.type === 'message' ? existing.config.text : '';
  const [text, setText] = useState(current);

  const grid = render({ type: 'message', text: text || ' ' }, ctx);

  // The board can hold rows×cols characters; count down like Twitter.
  const { rows, cols } = dimsOf(config.boardModel);
  const capacity = rows * cols;
  const remaining = capacity - text.length;
  const over = remaining < 0;
  // Word-wrapping can push text off the board before the raw char cap is hit.
  const overflows = wrapText(text, cols).length > rows;
  const countClass = over ? 'over' : remaining <= 20 ? 'low' : '';

  return (
    <section className="panel compose">
      <div className="compose-row">
        <div className="compose-input">
          <h2>Message the board</h2>
          <textarea
            rows={3}
            placeholder="Type a message to put on the board…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="compose-actions">
            <button onClick={() => onPost(text)} disabled={!text.trim() || over}>
              Post to board
            </button>
            {existing && (
              <button
                onClick={() => {
                  setText('');
                  onClear();
                }}
              >
                Clear
              </button>
            )}
            <span
              className={`char-count ${countClass}`}
              title={`${capacity} characters fit on this board`}
            >
              {remaining}
            </span>
            {overflows && !over && (
              <span className="hint" style={{ margin: 0 }}>
                Long lines may wrap off the board.
              </span>
            )}
            {existing && (
              <span className="hint" style={{ margin: 0 }}>
                On the board now — stays in rotation until cleared.
              </span>
            )}
          </div>
        </div>
        <div className="compose-preview">
          <BoardPreview grid={grid} />
        </div>
      </div>
    </section>
  );
}
