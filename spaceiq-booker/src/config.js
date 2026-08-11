// Loads config.json (tenant-specific settings) merged with sensible defaults.
// Nothing secret lives here — the login session is stored separately in the
// browser profile dir, never a corporate password.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const DEFAULTS = {
  // Base URL of your company's SpaceIQ web app. VERIFY this against the URL you
  // see in the browser after logging in — tenants differ.
  baseUrl: 'https://app.spaceiq.com',

  // Where the persistent, logged-in browser profile is stored. Keep this out of
  // git. Deleting it forces a fresh manual login.
  profileDir: join(ROOT, '.session'),

  // How many days ahead booking is allowed. You said "2 weeks".
  horizonDays: 14,

  // Which weekdays to keep booked, e.g. ["Tue","Thu"] or ["Mon","Wed","Fri"].
  weekdays: ['Tue', 'Thu'],

  // The seat/desk you want. Fill these in during the discovery step. `seatId`
  // is what the booking API/UI actually uses; `seatLabel` is just for logs.
  seatId: '',
  seatLabel: '',

  // Optional building/floor context some tenants require to resolve a seat.
  buildingId: '',
  floorId: '',

  // Run the browser visibly (headed). Recommended on a laptop so you can watch
  // it and complete an occasional MFA re-auth. Set false for silent runs.
  headed: true,

  // If true, do everything except actually confirm the booking. Great for a
  // first real run.
  dryRun: false,
};

/**
 * @returns {typeof DEFAULTS & { configPath: string }}
 */
export function loadConfig() {
  const configPath = process.env.SPACEIQ_CONFIG || join(ROOT, 'config.json');
  let fileCfg = {};
  if (existsSync(configPath)) {
    fileCfg = JSON.parse(readFileSync(configPath, 'utf8'));
  }
  const cfg = { ...DEFAULTS, ...fileCfg, configPath };

  // Env overrides for the handful of things you might want to flip per-run.
  if (process.env.SPACEIQ_HEADED != null) cfg.headed = process.env.SPACEIQ_HEADED !== '0';
  if (process.env.SPACEIQ_DRY_RUN != null) cfg.dryRun = process.env.SPACEIQ_DRY_RUN === '1';

  // Resolve profileDir relative to the project if it was given as a relative path.
  if (!cfg.profileDir.startsWith('/')) cfg.profileDir = resolve(ROOT, cfg.profileDir);
  return cfg;
}
