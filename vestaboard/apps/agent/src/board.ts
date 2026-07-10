import { Grid, isGrid, TransitionStrategy } from '@vestaboard/core';

export interface BoardClientOptions {
  /** Board hostname or IP, e.g. "vestaboard.local" or "192.168.1.40". */
  host: string;
  apiKey: string;
  port?: number;
  fetchImpl?: typeof fetch;
}

export class RateLimitedError extends Error {
  constructor() {
    super('board rejected the push (rate limited, ~15s between messages)');
  }
}

/**
 * Client for the Vestaboard Local API
 * (https://docs.vestaboard.com/docs/local-api/endpoints).
 */
export class BoardClient {
  private readonly base: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: BoardClientOptions) {
    this.base = `http://${options.host}:${options.port ?? 7000}/local-api`;
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getMessage(): Promise<Grid | null> {
    const res = await this.fetchImpl(`${this.base}/message`, {
      headers: { 'X-Vestaboard-Local-Api-Key': this.apiKey },
    });
    if (!res.ok) throw new Error(`board read failed: ${res.status}`);
    const body = await res.json();
    // The board wraps the grid as {message: [[...]]} on some firmware.
    const grid = Array.isArray(body) ? body : (body as { message?: unknown }).message;
    return isGrid(grid) ? grid : null;
  }

  /**
   * Push a grid, optionally with a native flip transition. The board
   * returns 503 when pushed inside its ~15s hardware window.
   */
  async postMessage(grid: Grid, transition?: TransitionStrategy): Promise<void> {
    const body = transition
      ? JSON.stringify({ characters: grid, strategy: transition })
      : JSON.stringify(grid);
    const res = await this.fetchImpl(`${this.base}/message`, {
      method: 'POST',
      headers: {
        'X-Vestaboard-Local-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body,
    });
    if (res.status === 503) throw new RateLimitedError();
    if (!res.ok) throw new Error(`board push failed: ${res.status}`);
  }
}
