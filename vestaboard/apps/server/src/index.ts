import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createApp } from './app.js';
import { Store } from './db.js';
import { RateLimitedError, VestaboardCloudClient } from './vestaboard.js';
import { LocalBoardClient } from './localboard.js';
import { buildSources } from './sources.js';
import { BoardPusher, PushClient, PusherStatus } from './pusher.js';

const PORT = Number(process.env.PORT ?? 8787);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

if (!process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET is required (any long random string)');
  process.exit(1);
}

const IDLE_STATUS: PusherStatus = {
  pushEnabled: false,
  lastPushedSlide: null,
  lastPushAt: null,
  lastError: null,
};

/**
 * First-boot convenience: copy keys from env into the DB when unset, so
 * the deploy-secret path (VESTABOARD_RW_KEY, etc.) still works. Once a
 * value exists in the DB, the Settings screen is the source of truth.
 */
function seedSettingsFromEnv(store: Store): void {
  const current = store.getSettings();
  const patch: Parameters<Store['updateSettings']>[0] = {};
  if (!current.vestaboardKey && process.env.VESTABOARD_RW_KEY) {
    patch.vestaboardKey = process.env.VESTABOARD_RW_KEY;
    if (process.env.VESTABOARD_API_URL) patch.vestaboardApiUrl = process.env.VESTABOARD_API_URL;
    if (process.env.VESTABOARD_AUTH_HEADER)
      patch.vestaboardAuthHeader = process.env.VESTABOARD_AUTH_HEADER;
  }
  if (!current.coingeckoApiKey && process.env.COINGECKO_API_KEY) {
    patch.coingeckoApiKey = process.env.COINGECKO_API_KEY;
  }
  if (!current.vestaboardLocalKey && process.env.VESTABOARD_LOCAL_KEY) {
    patch.vestaboardLocalKey = process.env.VESTABOARD_LOCAL_KEY;
    if (process.env.LOCAL_BOARD_HOST) patch.localBoardHost = process.env.LOCAL_BOARD_HOST;
  }
  if (Object.keys(patch).length > 0) {
    store.updateSettings(patch);
    console.log('[settings] seeded from environment');
  }
}

let pusher: BoardPusher | undefined;

const { app, store } = createApp({
  dbPath: process.env.DB_PATH ?? 'vestaboard.db',
  sessionSecret: process.env.SESSION_SECRET,
  baseUrl: BASE_URL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  agentToken: process.env.AGENT_TOKEN,
  devFakeAuth: process.env.DEV_FAKE_AUTH === '1',
  webDist: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist'),
  getPushStatus: () => pusher?.getStatus() ?? IDLE_STATUS,
});

app.listen(PORT, () => {
  console.log(`vestaboard server listening on ${BASE_URL}`);
  if (process.env.DEV_FAKE_AUTH === '1') {
    console.warn('WARNING: DEV_FAKE_AUTH is enabled — do not use in production');
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.warn('GOOGLE_CLIENT_ID not set — Google sign-in disabled');
  }
  if (!process.env.AGENT_TOKEN) {
    console.warn('AGENT_TOKEN not set — /api/agent/config disabled');
  }

  seedSettingsFromEnv(store);

  // Cloud push always runs; it reads the Vestaboard key from the DB each
  // tick (set in the Settings screen), so no restart is needed to start
  // pushing. Crypto quotes come from CoinGecko — no key required.
  pusher = new BoardPusher({
    getConfig: () => store.getConfig(),
    sources: buildSources(process.env, {
      coingeckoApiKey: store.getSettings().coingeckoApiKey ?? undefined,
      anthropicApiKey: store.getSettings().anthropicApiKey ?? undefined,
    }),
    getClient: (): PushClient | null => {
      const s = store.getSettings();
      const cloud = s.vestaboardKey
        ? new VestaboardCloudClient({
            token: s.vestaboardKey,
            url: s.vestaboardApiUrl ?? undefined,
            header: s.vestaboardAuthHeader ?? undefined,
          })
        : null;
      const local =
        s.localBoardHost && s.vestaboardLocalKey
          ? new LocalBoardClient({ host: s.localBoardHost, apiKey: s.vestaboardLocalKey })
          : null;
      if (!local && !cloud) return null;
      if (!local) {
        return {
          postMessage: async (grid) => {
            await cloud!.postMessage(grid);
            return 'cloud';
          },
        };
      }
      // Local first (transitions work there); if the tunnel is down, fall
      // back to the cloud API. A 503 means the board itself refused the
      // push (15s hardware window) — the cloud would hit the same wall, so
      // rate limits propagate instead of falling back.
      return {
        postMessage: async (grid, transition) => {
          try {
            await local.postMessage(grid, transition);
            return 'local';
          } catch (err) {
            if (err instanceof RateLimitedError || !cloud) throw err;
            console.log(`[pusher] local push failed (${String(err)}) — falling back to cloud`);
            await cloud.postMessage(grid);
            return 'cloud';
          }
        },
      };
    },
    now: () => new Date(),
    log: (message) => console.log(`[pusher] ${message}`),
  });
  void pusher.run((ms) => delay(ms));
});
