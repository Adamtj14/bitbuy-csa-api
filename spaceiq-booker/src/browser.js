// Persistent-context browser helpers. The whole auth model rests on this: we
// launch Chromium with a fixed user-data dir so cookies/tokens from your manual
// Microsoft SSO login survive between runs. No corporate password is ever
// stored or typed by the script.

import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

/**
 * Launch (or reuse) the persistent, logged-in browser profile.
 * @param {object} cfg
 * @param {boolean} [headedOverride]
 * @returns {Promise<import('playwright').BrowserContext>}
 */
export async function launchPersistent(cfg, headedOverride) {
  mkdirSync(cfg.profileDir, { recursive: true });
  const headed = headedOverride ?? cfg.headed;
  const context = await chromium.launchPersistentContext(cfg.profileDir, {
    headless: !headed,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  return context;
}

/**
 * Heuristic "are we still logged in?" check. Navigates to the app and looks for
 * a redirect to a login / Microsoft sign-in page. Tenant login hosts vary, so
 * this errs toward reporting "not logged in" and letting you re-auth.
 * @param {import('playwright').Page} page
 * @param {object} cfg
 * @returns {Promise<boolean>}
 */
export async function isLoggedIn(page, cfg) {
  await page.goto(cfg.baseUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(2500);
  const url = page.url();
  const loginish = /login|signin|sign-in|auth|microsoftonline|okta|adfs/i.test(url);
  return !loginish;
}
