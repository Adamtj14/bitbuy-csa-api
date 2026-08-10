#!/usr/bin/env node
// CLI entry point.
//   node src/index.js login      one-time manual SSO login (saves session)
//   node src/index.js discover   capture your tenant's booking API once
//   node src/index.js book       book target weekdays in the rolling window
//   node src/index.js status     show what it *would* book right now
import { loadConfig } from './config.js';
import { parseWeekdays, targetDatesInWindow, dateKey } from './dates.js';

const cmd = process.argv[2];

// Browser-backed commands are imported lazily so `status` and the tests work
// even before `npm install` pulls in Playwright.
async function main() {
  const cfg = loadConfig();
  switch (cmd) {
    case 'login':
      await (await import('./login.js')).runLogin(cfg);
      break;
    case 'discover':
      await (await import('./discover.js')).runDiscover(cfg);
      break;
    case 'book':
      await (await import('./book.js')).runBook(cfg);
      break;
    case 'status': {
      const targets = targetDatesInWindow(new Date(), cfg.horizonDays, parseWeekdays(cfg.weekdays));
      console.log(`Config: ${cfg.configPath}`);
      console.log(`Seat:   ${cfg.seatLabel || cfg.seatId || '(not set)'}`);
      console.log(`Base:   ${cfg.baseUrl}`);
      console.log(`Window: next ${cfg.horizonDays} days · ${cfg.weekdays.join(', ')}`);
      console.log(`Would target: ${targets.map(dateKey).join(', ') || '(none in window)'}`);
      break;
    }
    default:
      console.log('Usage: node src/index.js <login|discover|book|status>');
      process.exit(cmd ? 1 : 0);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
