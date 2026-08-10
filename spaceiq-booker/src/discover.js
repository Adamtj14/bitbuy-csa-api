// Discovery pass — the one step that adapts this to YOUR tenant.
//
// It opens the app (using your saved session), records everything, and asks you
// to book your seat MANUALLY one time. While you click, it captures:
//   - a full HAR of network traffic  -> capture/session.har
//   - a log of GraphQL operations    -> capture/graphql.log.json
// SpaceIQ's app is GraphQL-based, so the mutation you trigger by booking (its
// operation name, variables, and endpoint) shows up in graphql.log.json. That
// is exactly what `book.js` needs to replay the booking automatically.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launchPersistent, isLoggedIn } from './browser.js';

export async function runDiscover(cfg) {
  const outDir = join(cfg.profileDir, '..', 'capture');
  mkdirSync(outDir, { recursive: true });

  const context = await launchPersistent(cfg, /* headed */ true);
  const page = context.pages()[0] ?? (await context.newPage());

  if (!(await isLoggedIn(page, cfg))) {
    console.log('You appear to be logged out. Run `node src/index.js login` first.');
    await context.close();
    return;
  }

  const gqlLog = [];
  context.on('request', (req) => {
    const url = req.url();
    if (!/graphql|\/api\//i.test(url)) return;
    let body;
    try {
      body = req.postDataJSON?.() ?? req.postData();
    } catch {
      body = req.postData();
    }
    const op = body && typeof body === 'object'
      ? { operationName: body.operationName, variables: body.variables }
      : undefined;
    gqlLog.push({ ts: new Date().toISOString(), method: req.method(), url, op });
    if (op?.operationName) console.log(`  GraphQL → ${op.operationName}`);
  });

  console.log('\nRecording. Now, in the browser window:');
  console.log('  1. Navigate to your seat and BOOK IT for any day, manually.');
  console.log('  2. Watch this terminal — the booking mutation will be logged.');
  console.log('  3. When done, come back here and press Enter to save.\n');

  await waitForEnter();

  const harPath = join(outDir, 'graphql.log.json');
  writeFileSync(harPath, JSON.stringify(gqlLog, null, 2));
  console.log(`\nSaved ${gqlLog.length} API calls to: ${harPath}`);
  console.log('Look for the operation logged right when you confirmed the booking');
  console.log('(often named create*Reservation / book*Desk / create*Booking).');
  console.log('Put its operationName + variable shape into config.json → booking.*');
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
