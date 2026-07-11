import type { Grid } from '@vestaboard/core';

/**
 * Client for the Vestaboard Read-Write / Cloud API
 * (https://docs.vestaboard.com/docs/read-write-api/). The server pushes
 * directly over the internet — no LAN device needed. The board ignores
 * repeats inside its ~15s window and rate-limits with 429/503.
 *
 * Endpoint + header are overridable in case the account uses the older
 * rw.vestaboard.com / X-Vestaboard-Read-Write-Key pairing.
 */
export interface CloudClientOptions {
  token: string;
  url?: string;
  header?: string;
  fetchImpl?: typeof fetch;
}

export class RateLimitedError extends Error {
  constructor() {
    super('Vestaboard rate limited the push (~15s between messages)');
  }
}

const DEFAULT_URL = 'https://cloud.vestaboard.com/';
const DEFAULT_HEADER = 'X-Vestaboard-Token';

export class VestaboardCloudClient {
  private readonly url: string;
  private readonly header: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: CloudClientOptions) {
    this.url = options.url ?? DEFAULT_URL;
    this.header = options.header ?? DEFAULT_HEADER;
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /** Push a grid to the board. Throws RateLimitedError on 429/503. */
  async postMessage(grid: Grid): Promise<void> {
    const res = await this.fetchImpl(this.url, {
      method: 'POST',
      headers: {
        [this.header]: this.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ characters: grid }),
    });
    if (res.status === 429 || res.status === 503) throw new RateLimitedError();
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Vestaboard cloud push failed: ${res.status} ${body}`.trim());
    }
  }
}
