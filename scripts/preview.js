// Local preview: render the dashboard with sample data to out/preview.png (full color)
// and out/preview-eink.png (6-color Floyd-Steinberg dithered, what the panel will show).

import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { PNG } from "pngjs";

import { renderTree, W, H } from "../lib/dashboard.js";
import { sampleData } from "../lib/sampleData.js";
import { dither } from "../lib/dither.js";

const INTER_DIR = "node_modules/@fontsource/inter/files";
const interFile = (w) => path.resolve(`${INTER_DIR}/inter-latin-${w}-normal.woff`);
const fonts = [400, 500, 600, 700].map((weight) => ({
  name: "Inter",
  weight,
  style: "normal",
  data: fs.readFileSync(interFile(weight)),
}));

const outDir = path.resolve("out");
fs.mkdirSync(outDir, { recursive: true });

console.log("→ satori: building SVG…");
const svg = await satori(renderTree(sampleData), { width: W, height: H, fonts });

console.log("→ resvg: rasterizing…");
const resvg = new Resvg(svg, {
  background: "#FFFFFF",
  font: { loadSystemFonts: true, defaultFontFamily: "Liberation Sans" },
});
const rendered = resvg.render();
const pngBuf = rendered.asPng();
fs.writeFileSync(path.join(outDir, "preview.png"), pngBuf);
console.log(`  wrote out/preview.png (${rendered.width}x${rendered.height})`);

console.log("→ dither: quantizing to Spectra 6…");
const decoded = PNG.sync.read(pngBuf); // RGBA
const ditheredRGBA = dither(decoded.data, decoded.width, decoded.height);
const outPng = new PNG({ width: decoded.width, height: decoded.height });
ditheredRGBA.copy(outPng.data);
fs.writeFileSync(path.join(outDir, "preview-eink.png"), PNG.sync.write(outPng));
console.log("  wrote out/preview-eink.png");

console.log("done.");
