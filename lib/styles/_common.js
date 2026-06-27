// Shared scaffolding for the HTML-based style mockups: embedded Inter font,
// inline weather icons, an inline temp/precip graph, and small helpers.
// Rendered by a real headless Chromium (scripts/render.js), so full CSS is available.

import fs from "node:fs";
import path from "node:path";
import { weatherSvg } from "../icons.js";

// ---- fonts (base64 @font-face so no network is needed) -----------------------
const INTER_DIR = "node_modules/@fontsource/inter/files";
function fontFace(weight) {
  const b64 = fs.readFileSync(path.resolve(`${INTER_DIR}/inter-latin-${weight}-normal.woff`)).toString("base64");
  return `@font-face{font-family:'Inter';font-style:normal;font-weight:${weight};src:url(data:font/woff;base64,${b64}) format('woff');}`;
}
export const FONT_CSS = [400, 500, 600, 700].map(fontFace).join("\n");

// ---- weather icon (inline svg, scaled by CSS) --------------------------------
export function icon(kind, size) {
  return `<span class="wx" style="width:${size}px;height:${size}px">${weatherSvg(kind)}</span>`;
}
export const ICON_CSS = `.wx{display:inline-block;line-height:0}.wx svg{width:100%;height:100%;display:block}`;

// ---- month matrix ------------------------------------------------------------
export function monthWeeks(year, month) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// ---- inline temp (line) + precip (bars) graph --------------------------------
export function graphSvg(hours, opts = {}) {
  const {
    w = 1100, h = 170, temp = "#C8302A", precip = "#2156C0", ink = "#111111",
    labelColor = ink, lineW = 3, font = "Inter",
  } = opts;
  const padL = 26, padR = 26, padT = 26, padB = 26;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  const n = hours.length;
  const temps = hours.map((d) => d.t);
  const tMin = Math.min(...temps), tMax = Math.max(...temps);
  const tSpan = Math.max(1, tMax - tMin);
  const pMax = Math.max(1, ...hours.map((d) => d.p));
  const x = (i) => padL + (innerW * i) / (n - 1);
  const yT = (t) => padT + innerH - ((t - tMin) / tSpan) * innerH;
  const yP = (p) => (p / pMax) * (innerH * 0.7);

  let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" style="font-family:'${font}'">`;
  s += `<line x1="${padL}" y1="${padT + innerH}" x2="${w - padR}" y2="${padT + innerH}" stroke="${ink}" stroke-width="1"/>`;
  const bw = Math.min(36, Math.max(10, innerW / n - 26));
  hours.forEach((d, i) => {
    if (d.p > 0) {
      const bh = yP(d.p);
      s += `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${(padT + innerH - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${precip}" rx="4"/>`;
    }
  });
  // smooth temperature curve (Catmull-Rom -> cubic bezier)
  const P = hours.map((d, i) => ({ x: x(i), y: yT(d.t) }));
  let path = `M ${P[0].x.toFixed(1)} ${P[0].y.toFixed(1)}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  s += `<path d="${path}" fill="none" stroke="${temp}" stroke-width="${lineW}" stroke-linejoin="round" stroke-linecap="round"/>`;
  hours.forEach((d, i) => {
    const px = x(i), py = yT(d.t);
    s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="${temp}"/>`;
    s += `<text x="${px.toFixed(1)}" y="${(py - 11).toFixed(1)}" font-size="17" font-weight="600" fill="${labelColor}" text-anchor="middle">${d.t}°</text>`;
    s += `<text x="${px.toFixed(1)}" y="${h - 7}" font-size="15" fill="${labelColor}" text-anchor="middle">${d.h}</text>`;
  });
  s += `</svg>`;
  return s;
}

// ---- tiny html helpers -------------------------------------------------------
export const esc = (str) =>
  String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function pageShell({ title = "dashboard", css, body, bg = "#FFFFFF" }) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
${FONT_CSS}
${ICON_CSS}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:1600px}
body{font-family:'Inter',sans-serif;background:${bg};-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
${css}
</style></head><body>${body}</body></html>`;
}
