// Stylized, palette-safe weather icons for the 6-color Spectra panel.
// Yellow = sun, black-outline/white-fill = clouds, blue = rain/snow.
// Each returns an SVG string; iconDataUri() wraps it for use in <img src>.

const C = {
  black: "#000000",
  yellow: "#E8C800",
  blue: "#1B53C0",
  white: "#FFFFFF",
};

// A bold cloud silhouette (white fill, black outline) in a 0..100 box.
const cloud = (fill = C.white, stroke = C.black, sw = 6) =>
  `<path d="M 80 72 H 30 A 19 19 0 0 1 27 34 A 17 17 0 0 1 33 33 A 25 25 0 0 1 78 39 A 16 16 0 0 1 80 72 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;

const sun = (cx, cy, r, rays = true) => {
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.yellow}" stroke="${C.black}" stroke-width="4"/>`;
  if (rays) {
    const R1 = r + 6, R2 = r + 16;
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      const x1 = cx + Math.cos(a) * R1, y1 = cy + Math.sin(a) * R1;
      const x2 = cx + Math.cos(a) * R2, y2 = cy + Math.sin(a) * R2;
      s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${C.yellow}" stroke-width="6" stroke-linecap="round"/>`;
    }
  }
  return s;
};

const drops = (color = C.blue) =>
  [38, 56, 74].map(
    (x) =>
      `<line x1="${x}" y1="76" x2="${x - 6}" y2="92" stroke="${color}" stroke-width="6" stroke-linecap="round"/>`
  ).join("");

const flakes = (color = C.blue) =>
  [38, 56, 74].map(
    (x) =>
      `<text x="${x}" y="92" font-size="20" text-anchor="middle" fill="${color}">*</text>`
  ).join("");

const SVGS = {
  clear: () => `${sun(50, 50, 22)}`,
  partly: () =>
    `${sun(34, 34, 15)}${cloud(C.white, C.black, 6)}`,
  cloudy: () => `${cloud(C.white, C.black, 6)}`,
  overcast: () =>
    `<g opacity="1">${cloud(C.white, C.black, 6)}</g><path d="M 64 78 H 22 A 14 14 0 0 1 22 50" fill="none" stroke="${C.black}" stroke-width="5" stroke-linecap="round"/>`,
  rain: () => `${cloud(C.white, C.black, 6)}${drops(C.blue)}`,
  snow: () => `${cloud(C.white, C.black, 6)}${flakes(C.blue)}`,
  wind: () =>
    `<g fill="none" stroke="${C.black}" stroke-width="6" stroke-linecap="round">
       <path d="M 18 40 H 64 A 10 10 0 1 0 54 30"/>
       <path d="M 18 56 H 78 A 11 11 0 1 1 67 67"/>
       <path d="M 18 72 H 52 A 9 9 0 1 1 44 81"/>
     </g>`,
  thunder: () =>
    `${cloud(C.white, C.black, 6)}<polygon points="54,74 44,92 52,92 46,104 64,84 55,84 62,74" fill="${C.yellow}" stroke="${C.black}" stroke-width="3"/>`,
  fog: () =>
    `${cloud(C.white, C.black, 6)}<g stroke="${C.black}" stroke-width="5" stroke-linecap="round"><line x1="26" y1="82" x2="74" y2="82"/><line x1="32" y1="92" x2="80" y2="92"/></g>`,
};

export function weatherSvg(kind) {
  const draw = SVGS[kind] || SVGS.cloudy;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="100" height="110">${draw()}</svg>`;
}

export function iconDataUri(kind) {
  const svg = weatherSvg(kind);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// Map an Open-Meteo-style weather code (and our sample kinds) to an icon key.
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
