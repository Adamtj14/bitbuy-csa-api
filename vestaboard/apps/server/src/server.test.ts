import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { blankGrid } from '@vestaboard/core';
import { createApp } from './app.js';

let server: Server;
let base: string;

/** Cookie jar per simulated user. */
class Client {
  private cookies = new Map<string, string>();

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (this.cookies.size > 0) {
      headers.set(
        'cookie',
        [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; '),
      );
    }
    if (init.body) headers.set('content-type', 'application/json');
    const res = await fetch(`${base}${path}`, { ...init, headers, redirect: 'manual' });
    for (const raw of res.headers.getSetCookie()) {
      const [pair] = raw.split(';');
      const eq = pair!.indexOf('=');
      const name = pair!.slice(0, eq);
      const value = pair!.slice(eq + 1);
      if (value) this.cookies.set(name, value);
      else this.cookies.delete(name);
    }
    return res;
  }

  login(email: string, name?: string): Promise<Response> {
    const params = new URLSearchParams({ email, ...(name ? { name } : {}) });
    return this.request(`/auth/dev?${params}`);
  }
}

beforeAll(async () => {
  const { app } = createApp({
    dbPath: ':memory:',
    sessionSecret: 'test-secret',
    baseUrl: 'http://localhost',
    agentToken: 'agent-token-1',
    devFakeAuth: true,
  });
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server?.close());

describe('auth + roles', () => {
  const admin = new Client();
  const invitee = new Client();
  const stranger = new Client();

  it('rejects anonymous API calls', async () => {
    const res = await fetch(`${base}/api/config`);
    expect(res.status).toBe(401);
  });

  it('makes the first user admin', async () => {
    const login = await admin.login('adam@example.com', 'Adam');
    expect(login.status).toBe(302);
    const me = await admin.request('/api/me');
    expect(await me.json()).toMatchObject({ email: 'adam@example.com', role: 'admin' });
  });

  it('rejects uninvited users', async () => {
    const res = await stranger.login('rando@example.com');
    expect(res.status).toBe(403);
  });

  it('lets the admin invite, and the invitee join as member', async () => {
    const invite = await admin.request('/api/invites', {
      method: 'POST',
      body: JSON.stringify({ email: 'friend@example.com', role: 'member' }),
    });
    expect(invite.status).toBe(201);
    const login = await invitee.login('friend@example.com', 'Friend');
    expect(login.status).toBe(302);
    const me = await invitee.request('/api/me');
    expect(await me.json()).toMatchObject({ email: 'friend@example.com', role: 'member' });
  });

  it('blocks member from admin endpoints', async () => {
    for (const [path, init] of [
      ['/api/users', {}],
      ['/api/invites', {}],
      ['/api/rotation', { method: 'PUT', body: JSON.stringify({ frequencySeconds: 60 }) }],
      ['/api/config', { method: 'PUT', body: JSON.stringify({}) }],
      ['/api/settings', {}],
    ] as const) {
      const res = await invitee.request(path, init as RequestInit);
      expect(res.status, path).toBe(403);
    }
  });

  it('enforces the rotation floor', async () => {
    const res = await admin.request('/api/rotation', {
      method: 'PUT',
      body: JSON.stringify({ frequencySeconds: 5 }),
    });
    expect(res.status).toBe(400);
    const ok = await admin.request('/api/rotation', {
      method: 'PUT',
      body: JSON.stringify({ frequencySeconds: 45 }),
    });
    expect(ok.status).toBe(200);
  });

  it('lets members manage only their own painter slides', async () => {
    const denied = await invitee.request('/api/slides', {
      method: 'POST',
      body: JSON.stringify({
        id: 'member-clock',
        name: 'Nope',
        enabled: true,
        order: 5,
        config: { type: 'clock', style: 'word' },
      }),
    });
    expect(denied.status).toBe(403);

    const created = await invitee.request('/api/slides', {
      method: 'POST',
      body: JSON.stringify({
        id: 'member-art',
        name: 'My art',
        enabled: true, // members cannot enable; server forces false
        order: 1,
        config: { type: 'painter', grid: blankGrid() },
      }),
    });
    expect(created.status).toBe(201);
    const slide = await created.json();
    expect(slide.enabled).toBe(false);

    const foreignEdit = await invitee.request('/api/slides/default-word-clock', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'default-word-clock',
        name: 'Hijack',
        enabled: false,
        order: 1,
        config: { type: 'painter', grid: blankGrid() },
      }),
    });
    expect(foreignEdit.status).toBe(403);

    const ownEdit = await invitee.request('/api/slides/member-art', {
      method: 'PUT',
      body: JSON.stringify({ ...slide, name: 'My art v2' }),
    });
    expect(ownEdit.status).toBe(200);

    // Admin can enable the member's slide.
    const enabled = await admin.request('/api/slides/member-art', {
      method: 'PUT',
      body: JSON.stringify({ ...slide, name: 'My art v2', enabled: true }),
    });
    expect(enabled.status).toBe(200);
    expect((await enabled.json()).enabled).toBe(true);
  });

  it('protects the last admin', async () => {
    const users = (await (await admin.request('/api/users')).json()) as Array<{
      id: string;
      role: string;
    }>;
    const adminUser = users.find((u) => u.role === 'admin')!;
    const demote = await admin.request(`/api/users/${adminUser.id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: 'member' }),
    });
    expect(demote.status).toBe(400);
  });

  it('stores the vestaboard key (trimmed) and never returns it', async () => {
    const before = await (await admin.request('/api/settings')).json();
    expect(before.vestaboard.keySet).toBe(false);

    const put = await admin.request('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({
        vestaboardKey: '  secret-token  ',
        vestaboardApiUrl: 'https://rw.vestaboard.com/',
      }),
    });
    expect(put.status).toBe(200);
    const body = await put.json();
    expect(body.vestaboard.keySet).toBe(true);
    expect(body.vestaboard.apiUrl).toBe('https://rw.vestaboard.com/');
    // the secret is write-only — it must never appear in a response
    expect(JSON.stringify(body)).not.toContain('secret-token');

    const cleared = await admin.request('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ vestaboardKey: '' }),
    });
    expect((await cleared.json()).vestaboard.keySet).toBe(false);
  });

  it('serves config to the agent with a bearer token only', async () => {
    const no = await fetch(`${base}/api/agent/config`);
    expect(no.status).toBe(401);
    const yes = await fetch(`${base}/api/agent/config`, {
      headers: { authorization: 'Bearer agent-token-1' },
    });
    expect(yes.status).toBe(200);
    const config = await yes.json();
    expect(config.rotation.frequencySeconds).toBe(45);
    expect(config.slides.some((s: { id: string }) => s.id === 'member-art')).toBe(true);
  });
});
