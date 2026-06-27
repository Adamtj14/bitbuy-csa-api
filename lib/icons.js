// Weather icons from Meteocons (@bybas/weather-icons, "line" style — clean strokes).
// We strip the animations and recolor to a palette-safe scheme for the 6-color panel:
//   clouds/grays -> black, sun -> yellow, rain/snow -> blue.

import fs from "node:fs";
import path from "node:path";

const DIR = "node_modules/@bybas/weather-icons/production/line/all";

// our dashboard "kind" -> Meteocons file name
const MAP = {
  clear: "clear-day",
  partly: "partly-cloudy-day",
  cloudy: "cloudy",
  overcast: "overcast-day",
  rain: "rain",
  snow: "snow",
  thunder: "thunderstorms-day",
  fog: "fog-day",
  wind: "wind",
};

// Meteocons source color -> palette-safe color
const RECOLOR = [
  [/#e5e7eb/gi, "#111111"], // light cloud gray
  [/#d1d5db/gi, "#111111"], // cloud gray
  [/#9ca3af/gi, "#111111"], // gray (wind, etc.)
  [/#f59e0b/gi, "#E0A400"], // sun amber -> yellow
  [/#2885c7/gi, "#1E54C8"], // rain blue
  [/#72b8d4/gi, "#1E54C8"], // light blue -> blue
];

const cache = new Map();

function load(kind) {
  if (cache.has(kind)) return cache.get(kind);
  const file = MAP[kind] || MAP.cloudy;
  let svg = fs.readFileSync(path.resolve(`${DIR}/${file}.svg`), "utf8");
  // drop animation tags (self-closing and paired)
  svg = svg.replace(/<animate[a-zA-Z]*\b[\s\S]*?\/>/g, "");
  svg = svg.replace(/<animate[a-zA-Z]*\b[\s\S]*?<\/animate[a-zA-Z]*>/g, "");
  for (const [re, to] of RECOLOR) svg = svg.replace(re, to);
  cache.set(kind, svg);
  return svg;
}

export function weatherSvg(kind) {
  return load(kind);
}

export function iconDataUri(kind) {
  return `data:image/svg+xml;base64,${Buffer.from(load(kind)).toString("base64")}`;
}

// Map an Open-Meteo weather code to an icon key (used when live data arrives).
export function codeToKind(code) {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly";
  if (code === 3) return "overcast";
  if (code >= 45 && code <= 48) return "fog";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 85 && code <= 86) return "snow";
  if (code >= 95) return "thunder";
  return "cloudy";
}
