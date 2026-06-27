// Render each HTML style mockup with headless Chromium, screenshot at 1200x1600,
// then dither to the Spectra 6 palette. Writes out/<style>.png + out/<style>-eink.png.

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { PNG } from "pngjs";

import { sampleData } from "../lib/sampleData.js";
import { dither } from "../lib/dither.js";

import { html as darkHero } from "../lib/styles/dark-hero.js";
import { html as bento } from "../lib/styles/bento.js";
import { html as editorial } from "../lib/styles/editorial.js";
import { html as colorBlock } from "../lib/styles/color-block.js";

const STYLES = {
  "dark-hero": darkHero,
  bento,
  editorial,
  "color-block": colorBlock,
};

const W = 1200, H = 1600;
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium";
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

  const decoded = PNG.sync.read(pngBuf);
  const eink = dither(decoded.data, decoded.width, decoded.height);
  const outPng = new PNG({ width: decoded.width, height: decoded.height });
  eink.copy(outPng.data);
  fs.writeFileSync(path.join(outDir, `${name}-eink.png`), PNG.sync.write(outPng));
  console.log("ok");
}

await browser.close();
console.log("done.");
