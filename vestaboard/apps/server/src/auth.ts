import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import type { Store, User } from './db.js';
import type { Sessions } from './session.js';
import { parseCookies } from './session.js';

export interface AuthOptions {
  store: Store;
  sessions: Sessions;
  baseUrl: string;
  googleClientId?: string;
  googleClientSecret?: string;
  /** DANGER: dev-only fake login at /auth/dev — never enable in production. */
  devFakeAuth?: boolean;
  fetchImpl?: typeof fetch;
}

const STATE_COOKIE = 'vb_oauth_state';

/**
 * Google OAuth 2.0 code flow (openid email profile). Access rules:
 *  - first user ever becomes admin,
 *  - returning users log straight in,
 *  - everyone else needs an open invite for their email.
 */
export function authRouter(options: AuthOptions): Router {
  const { store, sessions } = options;
  const fetchImpl = options.fetchImpl ?? fetch;
  const router = Router();

  router.get('/auth/google', (req, res) => {
    if (!options.googleClientId) {
      res.status(500).send('GOOGLE_CLIENT_ID is not configured');
      return;
    }
    const state = randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      path: '/',
    });
    const params = new URLSearchParams({
      client_id: options.googleClientId,
      redirect_uri: `${options.baseUrl}/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  router.get('/auth/google/callback', async (req, res) => {
    try {
      const { code, state } = req.query as Record<string, string | undefined>;
      const expected = parseCookies(req.headers.cookie)[STATE_COOKIE];
      res.clearCookie(STATE_COOKIE, { path: '/' });
      if (!code || !state || !expected || state !== expected) {
        res.status(400).send('OAuth state mismatch — try signing in again.');
        return;
      }
      const tokenRes = await fetchImpl('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: options.googleClientId!,
          client_secret: options.googleClientSecret ?? '',
          redirect_uri: `${options.baseUrl}/auth/google/callback`,
          grant_type: 'authorization_code',
        }),
      });
      if (!tokenRes.ok) throw new Error(`token exchange failed: ${tokenRes.status}`);
      const tokens = (await tokenRes.json()) as { access_token?: string };
      if (!tokens.access_token) throw new Error('no access token');

      const infoRes = await fetchImpl('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { authorization: `Bearer ${tokens.access_token}` },
      });
      if (!infoRes.ok) throw new Error(`userinfo failed: ${infoRes.status}`);
      const info = (await infoRes.json()) as { sub: string; email?: string; name?: string };
      if (!info.email) throw new Error('Google account has no email');

      const user = resolveUser(store, info.sub, info.email, info.name ?? info.email);
      if (!user) {
        res
          .status(403)
          .send(
            `No invite found for ${info.email}. Ask the board admin to invite you, then sign in again.`,
          );
        return;
      }
      await sessions.issue(res, { uid: user.id });
      res.redirect('/');
    } catch (err) {
      res.status(500).send(`Sign-in failed: ${String(err)}`);
    }
  });

  if (options.devFakeAuth) {
    // Dev/testing only: /auth/dev?email=a@b.c&name=Ann — same access rules
    // as Google, minus the identity proof.
    router.get('/auth/dev', async (req, res) => {
      const { email, name } = req.query as Record<string, string | undefined>;
      if (!email) {
        res.status(400).send('email query param required');
        return;
      }
      const user = resolveUser(store, `dev:${email}`, email, name ?? email);
      if (!user) {
        res.status(403).send(`No invite for ${email}.`);
        return;
      }
      await sessions.issue(res, { uid: user.id });
      res.redirect('/');
    });
  }

  router.post('/auth/logout', (req, res) => {
    sessions.clear(res);
    res.json({ ok: true });
  });

  return router;
}

function resolveUser(store: Store, sub: string, email: string, name: string): User | null {
  const bySub = store.findUserByGoogleSub(sub);
  if (bySub) return bySub;
  const byEmail = store.findUserByEmail(email);
  if (byEmail) {
    store.attachGoogleSub(byEmail.id, sub, name);
    return { ...byEmail, googleSub: sub, name };
  }
  if (store.userCount() === 0) {
    return store.createUser({ googleSub: sub, email, name, role: 'admin' });
  }
  const invite = store.findOpenInvite(email);
  if (invite) {
    store.markInviteUsed(invite.id);
    return store.createUser({
      googleSub: sub,
      email,
      name,
      role: invite.role,
      invitedBy: invite.createdBy,
    });
  }
  return null;
}
