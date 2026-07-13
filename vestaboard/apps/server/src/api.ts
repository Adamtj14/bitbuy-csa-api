import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  MIN_FREQUENCY_SECONDS,
  Slide,
  boardConfigSchema,
  slideSchema,
} from '@vestaboard/core';
import type { Store, User } from './db.js';
import type { Sessions } from './session.js';
import type { PusherStatus } from './pusher.js';

export interface ApiOptions {
  store: Store;
  sessions: Sessions;
  agentToken?: string;
  /** Live push status for the Settings screen; absent = pusher not wired. */
  getPushStatus?: () => PusherStatus;
}

interface AuthedRequest extends Request {
  user?: User;
}

export function apiRouter(options: ApiOptions): Router {
  const { store, sessions } = options;
  const router = Router();

  // --- agent endpoint: bearer token, no session ---
  router.get('/api/agent/config', (req, res) => {
    if (!options.agentToken) {
      res.status(503).json({ error: 'AGENT_TOKEN not configured' });
      return;
    }
    const auth = req.headers.authorization ?? '';
    if (auth !== `Bearer ${options.agentToken}`) {
      res.status(401).json({ error: 'bad agent token' });
      return;
    }
    res.json(store.getConfig());
  });

  // --- session auth for everything else under /api ---
  const requireUser = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const session = await sessions.read(req);
    const user = session ? store.getUser(session.uid) : null;
    if (!user) {
      res.status(401).json({ error: 'not signed in' });
      return;
    }
    req.user = user;
    next();
  };

  const requireAdmin = (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'admin only' });
      return;
    }
    next();
  };

  router.use('/api', requireUser);

  router.get('/api/me', (req: AuthedRequest, res) => {
    const { id, email, name, role } = req.user!;
    res.json({ id, email, name, role });
  });

  router.get('/api/config', (req, res) => {
    res.json(store.getConfig());
  });

  // Full-document replace: admin only (used by import + bulk edits).
  router.put('/api/config', requireAdmin, (req, res) => {
    const parsed = boardConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'invalid config' });
      return;
    }
    store.saveConfig(parsed.data as Parameters<Store['saveConfig']>[0]);
    res.json(store.getConfig());
  });

  const rotationSchema = z.object({
    frequencySeconds: z.number().min(MIN_FREQUENCY_SECONDS),
  });

  router.put('/api/rotation', requireAdmin, (req, res) => {
    const parsed = rotationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: `frequency must be >= ${MIN_FREQUENCY_SECONDS}s` });
      return;
    }
    const config = store.getConfig();
    config.rotation = parsed.data;
    store.saveConfig(config);
    res.json(config);
  });

  // --- slides: members may only create/edit/delete their own painter slides ---

  router.post('/api/slides', (req: AuthedRequest, res) => {
    const parsed = slideSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'invalid slide' });
      return;
    }
    const user = req.user!;
    const slide = parsed.data as Slide;
    const config = store.getConfig();
    if (config.slides.some((s) => s.id === slide.id)) {
      res.status(409).json({ error: 'slide id already exists' });
      return;
    }
    slide.createdBy = user.id;
    if (user.role !== 'admin') {
      if (slide.config.type !== 'painter') {
        res.status(403).json({ error: 'members can only create painter slides' });
        return;
      }
      // Rotation control (enable/order) stays admin-only.
      slide.enabled = false;
      slide.order = config.slides.length + 1;
    }
    config.slides.push(slide);
    store.saveConfig(config);
    res.status(201).json(slide);
  });

  router.put('/api/slides/:id', (req: AuthedRequest, res) => {
    const parsed = slideSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'invalid slide' });
      return;
    }
    const user = req.user!;
    const incoming = parsed.data as Slide;
    const config = store.getConfig();
    const index = config.slides.findIndex((s) => s.id === req.params.id);
    const existing = config.slides[index];
    if (!existing) {
      res.status(404).json({ error: 'slide not found' });
      return;
    }
    if (user.role !== 'admin') {
      const ownPainter =
        existing.createdBy === user.id && existing.config.type === 'painter';
      if (!ownPainter || incoming.config.type !== 'painter') {
        res.status(403).json({ error: 'members can only edit their own painter slides' });
        return;
      }
      // Members cannot toggle rotation state or reorder.
      incoming.enabled = existing.enabled;
      incoming.order = existing.order;
    }
    incoming.id = existing.id;
    incoming.createdBy = existing.createdBy;
    config.slides[index] = incoming;
    store.saveConfig(config);
    res.json(incoming);
  });

  router.delete('/api/slides/:id', (req: AuthedRequest, res) => {
    const user = req.user!;
    const config = store.getConfig();
    const existing = config.slides.find((s) => s.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'slide not found' });
      return;
    }
    if (
      user.role !== 'admin' &&
      !(existing.createdBy === user.id && existing.config.type === 'painter')
    ) {
      res.status(403).json({ error: 'members can only delete their own painter slides' });
      return;
    }
    config.slides = config.slides.filter((s) => s.id !== existing.id);
    store.saveConfig(config);
    res.json({ ok: true });
  });

  // --- users & invites: admin only ---

  router.get('/api/users', requireAdmin, (req, res) => {
    res.json(
      store.listUsers().map(({ id, email, name, role, createdAt }) => ({
        id,
        email,
        name,
        role,
        createdAt,
      })),
    );
  });

  const roleSchema = z.object({ role: z.enum(['admin', 'member']) });

  router.put('/api/users/:id/role', requireAdmin, (req: AuthedRequest, res) => {
    const parsed = roleSchema.safeParse(req.body);
    const target = store.getUser(req.params.id ?? '');
    if (!parsed.success || !target) {
      res.status(400).json({ error: 'bad role or user' });
      return;
    }
    if (target.role === 'admin' && parsed.data.role === 'member' && adminCount(store) === 1) {
      res.status(400).json({ error: 'cannot demote the last admin' });
      return;
    }
    store.setUserRole(target.id, parsed.data.role);
    res.json({ ok: true });
  });

  router.delete('/api/users/:id', requireAdmin, (req: AuthedRequest, res) => {
    const target = store.getUser(req.params.id ?? '');
    if (!target) {
      res.status(404).json({ error: 'user not found' });
      return;
    }
    if (target.role === 'admin' && adminCount(store) === 1) {
      res.status(400).json({ error: 'cannot remove the last admin' });
      return;
    }
    store.deleteUser(target.id);
    res.json({ ok: true });
  });

  // --- settings: admin only. Secrets are write-only (never returned). ---

  const settingsResponse = () => {
    const s = store.getSettings();
    return {
      vestaboard: {
        keySet: Boolean(s.vestaboardKey),
        apiUrl: s.vestaboardApiUrl,
        authHeader: s.vestaboardAuthHeader,
      },
      coingecko: { keySet: Boolean(s.coingeckoApiKey) },
      anthropic: { keySet: Boolean(s.anthropicApiKey) },
      push: options.getPushStatus?.() ?? null,
    };
  };

  router.get('/api/settings', requireAdmin, (req, res) => {
    res.json(settingsResponse());
  });

  const settingsSchema = z.object({
    vestaboardKey: z.string().nullable().optional(),
    vestaboardApiUrl: z.string().nullable().optional(),
    vestaboardAuthHeader: z.string().nullable().optional(),
    coingeckoApiKey: z.string().nullable().optional(),
    anthropicApiKey: z.string().nullable().optional(),
  });

  router.put('/api/settings', requireAdmin, (req, res) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid settings' });
      return;
    }
    // Only touch fields that were actually provided; trim, '' clears.
    const patch: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value === undefined) continue;
      patch[key] = value === null ? null : value.trim();
    }
    store.updateSettings(patch as Parameters<Store['updateSettings']>[0]);
    res.json(settingsResponse());
  });

  router.get('/api/invites', requireAdmin, (req, res) => {
    res.json(store.listInvites());
  });

  const inviteSchema = z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'member']).default('member'),
  });

  router.post('/api/invites', requireAdmin, (req: AuthedRequest, res) => {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'valid email required' });
      return;
    }
    if (store.findUserByEmail(parsed.data.email)) {
      res.status(409).json({ error: 'that email already has an account' });
      return;
    }
    if (store.findOpenInvite(parsed.data.email)) {
      res.status(409).json({ error: 'an open invite already exists for that email' });
      return;
    }
    res.status(201).json(store.createInvite(parsed.data.email, parsed.data.role, req.user!.id));
  });

  router.delete('/api/invites/:id', requireAdmin, (req, res) => {
    store.deleteInvite(req.params.id ?? '');
    res.json({ ok: true });
  });

  return router;
}

function adminCount(store: Store): number {
  return store.listUsers().filter((u) => u.role === 'admin').length;
}
