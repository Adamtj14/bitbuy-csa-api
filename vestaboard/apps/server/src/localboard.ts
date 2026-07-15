import type { Grid, TransitionStrategy } from '@vestaboard/core';
import { RateLimitedError } from './vestaboard.js';

export interface LocalBoardOptions {
  /** Board LAN hostname or IP, reachable from the server (e.g. via Tailscale). */
  host: string;
  apiKey: string;
  port?: number;
  /** Fail fast when the tunnel is down so the cloud fallback can take over. */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Client for the Vestaboard Local API
 * (https://docs.vestaboard.com/docs/local-api/endpoints), same protocol as
 * the Pi agent's client. Unlike the cloud Read-Write API it accepts a flip
 * `strategy`, which is what makes per-slide transitions work. The server
 * reaches the board's LAN address through the Tailscale subnet route.
 */
export class LocalBoardClient {
  private readonly base: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: LocalBoardOptions) {
    this.base = `http://${options.host}:${options.port ?? 7000}/local-api`;
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /**
   * Push a grid, optionally with a native flip transition. The board
   * returns 503 inside its ~15s hardware window.
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
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (res.status === 503) throw new RateLimitedError();
    if (!res.ok) throw new Error(`local board push failed: ${res.status}`);
  }
}
