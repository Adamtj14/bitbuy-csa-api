import { SignJWT, jwtVerify } from 'jose';
import type { Request, Response } from 'express';

const COOKIE = 'vb_session';
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export interface SessionPayload {
  uid: string;
}

export class Sessions {
  private readonly key: Uint8Array;

  constructor(secret: string, private readonly secureCookies: boolean) {
    this.key = new TextEncoder().encode(secret);
  }

  async issue(res: Response, payload: SessionPayload): Promise<void> {
    const jwt = await new SignJWT({ uid: payload.uid })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${MAX_AGE_SECONDS}s`)
      .sign(this.key);
    res.cookie(COOKIE, jwt, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.secureCookies,
      maxAge: MAX_AGE_SECONDS * 1000,
      path: '/',
    });
  }

  async read(req: Request): Promise<SessionPayload | null> {
    const raw = parseCookies(req.headers.cookie)[COOKIE];
    if (!raw) return null;
    try {
      const { payload } = await jwtVerify(raw, this.key);
      return typeof payload.uid === 'string' ? { uid: payload.uid } : null;
    } catch {
      return null;
    }
  }

  clear(res: Response): void {
    res.clearCookie(COOKIE, { path: '/' });
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    cookies[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return cookies;
}
