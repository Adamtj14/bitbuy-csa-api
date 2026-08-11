// One-time (occasional) manual login. Opens a real, visible browser window on
// the SpaceIQ URL. You complete Microsoft SSO + MFA by hand; the session is
// saved into the persistent profile dir so every later `book` run reuses it.

import { launchPersistent } from './browser.js';

export async function runLogin(cfg) {
  console.log('Opening a browser window for SpaceIQ.');
  console.log('→ Sign in with Microsoft SSO (and MFA) as you normally would.');
  console.log('→ When you can see the seat-booking screen, come back here and press Enter.\n');

  const context = await launchPersistent(cfg, /* headed */ true);
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(cfg.baseUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});

  await waitForEnter();

  console.log(`\nSession saved to: ${cfg.profileDir}`);
  console.log('You can close the window. Future `book` runs will reuse this login.');
  await context.close();
}

function waitForEnter() {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.pause();
      resolve();
    });
  });
}
