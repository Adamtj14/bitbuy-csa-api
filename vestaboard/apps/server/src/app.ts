import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import { apiRouter } from './api.js';
import { authRouter, type AuthOptions } from './auth.js';
import { Store } from './db.js';
import { Sessions } from './session.js';
import type { PusherStatus } from './pusher.js';

export interface AppOptions {
  dbPath: string;
  sessionSecret: string;
  baseUrl: string;
  googleClientId?: string;
  googleClientSecret?: string;
  agentToken?: string;
  devFakeAuth?: boolean;
  /** Absolute path to the built web app; served with SPA fallback if present. */
  webDist?: string;
  fetchImpl?: AuthOptions['fetchImpl'];
  /** Live push status for the Settings screen. */
  getPushStatus?: () => PusherStatus;
}

export function createApp(options: AppOptions): { app: Express; store: Store } {
  const store = new Store(options.dbPath);
  const sessions = new Sessions(options.sessionSecret, options.baseUrl.startsWith('https://'));

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  app.use(
    authRouter({
      store,
      sessions,
      baseUrl: options.baseUrl,
      googleClientId: options.googleClientId,
      googleClientSecret: options.googleClientSecret,
      devFakeAuth: options.devFakeAuth,
      fetchImpl: options.fetchImpl,
    }),
  );

  app.use(
    apiRouter({
      store,
      sessions,
      agentToken: options.agentToken,
      getPushStatus: options.getPushStatus,
    }),
  );

  if (options.webDist && existsSync(options.webDist)) {
    const webDist = options.webDist;
    app.use(express.static(webDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  return { app, store };
}
