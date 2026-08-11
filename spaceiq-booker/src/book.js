// Core booking run. Reuses your saved SSO session, works out which dates in the
// rolling window should be booked, and books the ones that aren't yet.
//
// Booking is performed by replaying your tenant's GraphQL "create reservation"
// mutation (captured once via `discover`). The request is issued from *inside*
// the authenticated app page, so it rides on the same cookies/token your real
// clicks use — nothing about the Microsoft login has to be reproduced.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launchPersistent, isLoggedIn } from './browser.js';
import { loadConfig } from './config.js';
import { parseWeekdays, targetDatesInWindow, dateKey } from './dates.js';

export async function runBook(cfgArg) {
  const cfg = cfgArg ?? loadConfig();
  assertBookingConfigured(cfg);

  const weekdaySet = parseWeekdays(cfg.weekdays);
  const targets = targetDatesInWindow(new Date(), cfg.horizonDays, weekdaySet);
  if (targets.length === 0) {
    console.log('No target weekdays fall inside the booking window right now. Nothing to do.');
    return { booked: [], skipped: [], failed: [] };
  }

  console.log(`Seat: ${cfg.seatLabel || cfg.seatId}`);
  console.log(`Window: next ${cfg.horizonDays} days · weekdays ${cfg.weekdays.join(', ')}`);
  console.log(`Target dates: ${targets.map(dateKey).join(', ')}`);
  if (cfg.dryRun) console.log('DRY RUN — no booking will be confirmed.\n');

  const shotDir = join(cfg.profileDir, '..', 'screenshots');
  mkdirSync(shotDir, { recursive: true });

  const context = await launchPersistent(cfg);
  const page = context.pages()[0] ?? (await context.newPage());
  const result = { booked: [], skipped: [], failed: [] };

  try {
    if (!(await isLoggedIn(page, cfg))) {
      console.log('Not logged in. Run `node src/index.js login` and try again.');
      result.failed = targets.map(dateKey);
      return result;
    }

    for (const date of targets) {
      const key = dateKey(date);
      try {
        const outcome = await bookOneDateViaApi(page, cfg, key);
        if (outcome === 'dry-run') {
          console.log(`  ${key}: would book (dry run)`);
          result.skipped.push(key);
        } else if (outcome === 'already') {
          console.log(`  ${key}: already booked — skipped`);
          result.skipped.push(key);
        } else {
          console.log(`  ${key}: booked ✓`);
          result.booked.push(key);
        }
      } catch (err) {
        console.log(`  ${key}: FAILED — ${err.message}`);
        await page.screenshot({ path: join(shotDir, `fail-${key}.png`) }).catch(() => {});
        result.failed.push(key);
      }
    }
  } finally {
    await context.close();
  }

  console.log(
    `\nDone. Booked ${result.booked.length}, skipped ${result.skipped.length}, failed ${result.failed.length}.`,
  );
  return result;
}

/**
 * Replay the tenant's booking mutation for a single date, from inside the page.
 * @returns {Promise<'booked'|'already'|'dry-run'>}
 */
async function bookOneDateViaApi(page, cfg, dateStr) {
  const b = cfg.booking;
  const variables = substituteTokens(b.variables, {
    seatId: cfg.seatId,
    buildingId: cfg.buildingId,
    floorId: cfg.floorId,
    date: dateStr,
  });

  if (cfg.dryRun) return 'dry-run';

  const res = await page.evaluate(
    async ({ path, query, variables, tokenKey }) => {
      // Best-effort auth: cookies ride automatically via credentials:'include';
      // if the app keeps a bearer token in storage, forward it too.
      const headers = { 'content-type': 'application/json' };
      if (tokenKey) {
        const raw = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
        if (raw) headers.authorization = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`;
      }
      const r = await fetch(path, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ query, variables }),
      });
      const text = await r.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { parseError: true, raw: text.slice(0, 500) };
      }
      return { status: r.status, json };
    },
    { path: b.graphqlPath, query: b.mutation, variables, tokenKey: b.authTokenStorageKey || '' },
  );

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(res.json).slice(0, 300)}`);
  }
  if (res.json?.errors?.length) {
    const msg = res.json.errors.map((e) => e.message).join('; ');
    // A friendly "already reserved" style error counts as success, not failure.
    if (/already|exists|duplicate/i.test(msg)) return 'already';
    throw new Error(msg);
  }
  return 'booked';
}

/** Recursively replace "{{token}}" placeholders in the variables template. */
function substituteTokens(value, tokens) {
  if (typeof value === 'string') {
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in tokens ? tokens[k] : `{{${k}}}`));
  }
  if (Array.isArray(value)) return value.map((v) => substituteTokens(v, tokens));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = substituteTokens(v, tokens);
    return out;
  }
  return value;
}

function assertBookingConfigured(cfg) {
  const problems = [];
  if (!cfg.seatId) problems.push('seatId is empty');
  if (!cfg.booking || !cfg.booking.mutation) problems.push('booking.mutation is missing');
  if (!cfg.booking || !cfg.booking.graphqlPath) problems.push('booking.graphqlPath is missing');
  if (problems.length) {
    throw new Error(
      `Not configured yet: ${problems.join(', ')}.\n` +
        'Run `node src/index.js discover`, book your seat once by hand, then copy the\n' +
        'captured mutation + seat id into config.json. See README "Discovery step".',
    );
  }
}
