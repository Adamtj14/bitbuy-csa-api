import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createApp } from './app.js';
import { VestaboardCloudClient } from './vestaboard.js';
import { buildSources } from './sources.js';
import { BoardPusher } from './pusher.js';

const PORT = Number(process.env.PORT ?? 8787);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

if (!process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET is required (any long random string)');
  process.exit(1);
}

const { app, store } = createApp({
  dbPath: process.env.DB_PATH ?? 'vestaboard.db',
  sessionSecret: process.env.SESSION_SECRET,
  baseUrl: BASE_URL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  agentToken: process.env.AGENT_TOKEN,
  devFakeAuth: process.env.DEV_FAKE_AUTH === '1',
  webDist: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist'),
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

  // Cloud push: when a Read-Write key is set, the server renders the active
  // slide and pushes it to the board over the internet — no LAN agent needed.
  if (process.env.VESTABOARD_RW_KEY) {
    const client = new VestaboardCloudClient({
      token: process.env.VESTABOARD_RW_KEY,
      url: process.env.VESTABOARD_API_URL,
      header: process.env.VESTABOARD_AUTH_HEADER,
    });
    const pusher = new BoardPusher({
      getConfig: () => store.getConfig(),
      sources: buildSources(),
      client,
      now: () => new Date(),
      log: (message) => console.log(`[pusher] ${message}`),
    });
    void pusher.run((ms) => delay(ms));
  } else {
    console.warn('VESTABOARD_RW_KEY not set — cloud push disabled (board will not update)');
  }
});
