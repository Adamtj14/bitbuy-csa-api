// Render each HTML style mockup with headless Chromium, screenshot at 1200x1600.
// Dithering is OPT-IN (set DITHER=1) while we iterate on the look; by default we
// write only the full-color out/<style>.png.

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

import { sampleData } from "../lib/sampleData.js";
import { STYLES } from "../lib/styles/index.js";

const W = 1200, H = 1600;
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium";
const DO_DITHER = !!process.env.DITHER;
const outDir = path.resolve("out");
fs.mkdirSync(outDir, { recursive: true });

const only = process.argv[2]; // optional: render a single style

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb"],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

for (const [name, build] of Object.entries(STYLES)) {
  if (only && only !== name) continue;
  process.stdout.write(`→ ${name}: render… `);
  await page.setContent(build(sampleData), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const pngBuf = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } });
  fs.writeFileSync(path.join(outDir, `${name}.png`), pngBuf);

  if (DO_DITHER) {
    const { PNG } = await import("pngjs");
    const { dither } = await import("../lib/dither.js");
    const decoded = PNG.sync.read(pngBuf);
    const eink = dither(decoded.data, decoded.width, decoded.height);
    const outPng = new PNG({ width: decoded.width, height: decoded.height });
    eink.copy(outPng.data);
    fs.writeFileSync(path.join(outDir, `${name}-eink.png`), PNG.sync.write(outPng));
  }
  console.log("ok");
}

await browser.close();
console.log("done.");
