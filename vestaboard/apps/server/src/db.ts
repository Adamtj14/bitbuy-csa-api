import { randomUUID } from 'node:crypto';
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';
import { BoardConfig, parseBoardConfig } from '@vestaboard/core';

// Loaded via getBuiltinModule (not a static import) because vite-node's
// transform predates node:sqlite and mangles the specifier in tests.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
type DatabaseSync = DatabaseSyncType;

export type Role = 'admin' | 'member';

export interface User {
  id: string;
  googleSub: string | null;
  email: string;
  name: string;
  role: Role;
  invitedBy: string | null;
  createdAt: string;
}

export interface Invite {
  id: string;
  email: string;
  role: Role;
  createdBy: string;
  createdAt: string;
  usedAt: string | null;
}

/** Runtime-editable settings (stored in the DB, set from the Studio UI). */
export interface AppSettings {
  vestaboardKey: string | null;
  vestaboardApiUrl: string | null;
  vestaboardAuthHeader: string | null;
  /** Board LAN host/IP for Local-API push (reached via Tailscale). */
  localBoardHost: string | null;
  /** Local API key — enables per-slide transitions when set with a host. */
  vestaboardLocalKey: string | null;
  coingeckoApiKey: string | null;
  anthropicApiKey: string | null;
}

const SETTING_KEYS: Record<keyof AppSettings, string> = {
  vestaboardKey: 'vestaboard_key',
  vestaboardApiUrl: 'vestaboard_api_url',
  vestaboardAuthHeader: 'vestaboard_auth_header',
  localBoardHost: 'local_board_host',
  vestaboardLocalKey: 'vestaboard_local_key',
  coingeckoApiKey: 'coingecko_api_key',
  anthropicApiKey: 'anthropic_api_key',
};

const DEFAULT_CONFIG: BoardConfig = {
  rotation: { frequencySeconds: 30 },
  slides: [
    {
      id: 'default-word-clock',
      name: 'Word clock',
      enabled: true,
      order: 1,
      config: { type: 'clock', style: 'word' },
    },
  ],
};

/**
 * SQLite storage (node:sqlite, no native deps — needs Node >= 22.5).
 * Board config is one JSON document: it's a single physical board, and
 * the agent consumes the whole document at once.
 */
export class Store {
  private db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        google_sub TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL CHECK (role IN ('admin','member')),
        invited_by TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS invites (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin','member')),
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        used_at TEXT
      );
      CREATE TABLE IF NOT EXISTS board_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  private rowToUser(row: Record<string, unknown>): User {
    return {
      id: String(row.id),
      googleSub: row.google_sub === null ? null : String(row.google_sub),
      email: String(row.email),
      name: String(row.name),
      role: row.role as Role,
      invitedBy: row.invited_by === null ? null : String(row.invited_by),
      createdAt: String(row.created_at),
    };
  }

  userCount(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
    return Number(row.n);
  }

  getUser(id: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return row ? this.rowToUser(row as Record<string, unknown>) : null;
  }

  findUserByEmail(email: string): User | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE lower(email) = lower(?)')
      .get(email);
    return row ? this.rowToUser(row as Record<string, unknown>) : null;
  }

  findUserByGoogleSub(sub: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE google_sub = ?').get(sub);
    return row ? this.rowToUser(row as Record<string, unknown>) : null;
  }

  listUsers(): User[] {
    const rows = this.db.prepare('SELECT * FROM users ORDER BY created_at').all();
    return rows.map((r) => this.rowToUser(r as Record<string, unknown>));
  }

  createUser(input: {
    googleSub: string | null;
    email: string;
    name: string;
    role: Role;
    invitedBy?: string | null;
  }): User {
    const user: User = {
      id: randomUUID(),
      googleSub: input.googleSub,
      email: input.email,
      name: input.name,
      role: input.role,
      invitedBy: input.invitedBy ?? null,
      createdAt: new Date().toISOString(),
    };
    this.db
      .prepare(
        `INSERT INTO users (id, google_sub, email, name, role, invited_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(user.id, user.googleSub, user.email, user.name, user.role, user.invitedBy, user.createdAt);
    return user;
  }

  attachGoogleSub(userId: string, sub: string, name: string): void {
    this.db
      .prepare('UPDATE users SET google_sub = ?, name = ? WHERE id = ?')
      .run(sub, name, userId);
  }

  setUserRole(id: string, role: Role): void {
    this.db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  }

  deleteUser(id: string): void {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }

  private rowToInvite(row: Record<string, unknown>): Invite {
    return {
      id: String(row.id),
      email: String(row.email),
      role: row.role as Role,
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      usedAt: row.used_at === null ? null : String(row.used_at),
    };
  }

  listInvites(): Invite[] {
    const rows = this.db.prepare('SELECT * FROM invites ORDER BY created_at').all();
    return rows.map((r) => this.rowToInvite(r as Record<string, unknown>));
  }

  findOpenInvite(email: string): Invite | null {
    const row = this.db
      .prepare('SELECT * FROM invites WHERE lower(email) = lower(?) AND used_at IS NULL')
      .get(email);
    return row ? this.rowToInvite(row as Record<string, unknown>) : null;
  }

  createInvite(email: string, role: Role, createdBy: string): Invite {
    const invite: Invite = {
      id: randomUUID(),
      email,
      role,
      createdBy,
      createdAt: new Date().toISOString(),
      usedAt: null,
    };
    this.db
      .prepare(
        `INSERT INTO invites (id, email, role, created_by, created_at, used_at)
         VALUES (?, ?, ?, ?, ?, NULL)`,
      )
      .run(invite.id, invite.email, invite.role, invite.createdBy, invite.createdAt);
    return invite;
  }

  markInviteUsed(id: string): void {
    this.db
      .prepare('UPDATE invites SET used_at = ? WHERE id = ?')
      .run(new Date().toISOString(), id);
  }

  deleteInvite(id: string): void {
    this.db.prepare('DELETE FROM invites WHERE id = ?').run(id);
  }

  getConfig(): BoardConfig {
    const row = this.db.prepare('SELECT json FROM board_config WHERE id = 1').get() as
      | { json: string }
      | undefined;
    if (!row) return structuredClone(DEFAULT_CONFIG);
    try {
      return parseBoardConfig(JSON.parse(row.json));
    } catch {
      return structuredClone(DEFAULT_CONFIG);
    }
  }

  saveConfig(config: BoardConfig): void {
    this.db
      .prepare(
        `INSERT INTO board_config (id, json, updated_at) VALUES (1, ?, ?)
         ON CONFLICT (id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`,
      )
      .run(JSON.stringify(config), new Date().toISOString());
  }

  // --- settings (key/value) ---

  private getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row ? row.value : null;
  }

  private setSetting(key: string, value: string | null): void {
    if (value === null || value === '') {
      this.db.prepare('DELETE FROM settings WHERE key = ?').run(key);
      return;
    }
    this.db
      .prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
      )
      .run(key, value);
  }

  getSettings(): AppSettings {
    return {
      vestaboardKey: this.getSetting(SETTING_KEYS.vestaboardKey),
      vestaboardApiUrl: this.getSetting(SETTING_KEYS.vestaboardApiUrl),
      vestaboardAuthHeader: this.getSetting(SETTING_KEYS.vestaboardAuthHeader),
      localBoardHost: this.getSetting(SETTING_KEYS.localBoardHost),
      vestaboardLocalKey: this.getSetting(SETTING_KEYS.vestaboardLocalKey),
      coingeckoApiKey: this.getSetting(SETTING_KEYS.coingeckoApiKey),
      anthropicApiKey: this.getSetting(SETTING_KEYS.anthropicApiKey),
    };
  }

  /** Update only the provided fields; `null`/'' clears a value. */
  updateSettings(patch: Partial<AppSettings>): AppSettings {
    for (const [field, storageKey] of Object.entries(SETTING_KEYS) as [
      keyof AppSettings,
      string,
    ][]) {
      if (field in patch) this.setSetting(storageKey, patch[field] ?? null);
    }
    return this.getSettings();
  }

  close(): void {
    this.db.close();
  }
}
