// Write each style as a self-contained HTML file (fonts embedded as base64) to
// out/<style>.html. No browser needed — open the files directly in any browser.
// Fast iteration loop while we explore the design; dithering comes later.

import fs from "node:fs";
import path from "node:path";
import { sampleData } from "../lib/sampleData.js";
import { STYLES } from "../lib/styles/index.js";

const outDir = path.resolve("out");
fs.mkdirSync(outDir, { recursive: true });

const only = process.argv[2];
for (const [name, build] of Object.entries(STYLES)) {
  if (only && only !== name) continue;
  fs.writeFileSync(path.join(outDir, `${name}.html`), build(sampleData));
  console.log(`wrote out/${name}.html`);
}
console.log("done.");
