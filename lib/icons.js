// Refined, palette-safe weather icons for the 6-color Spectra panel.
// Consistent stroke weight, smooth shapes; a restrained use of color.

const C = {
  ink: "#111111",
  yellow: "#E0AE00",
  blue: "#2156C0",
  white: "#FFFFFF",
};

const SW = 4; // unified stroke weight

// Smooth cloud silhouette (white fill, thin black outline) in a 0..100 box.
const cloud = (sw = SW) =>
  `<path d="M 79 71 H 31 A 18 18 0 0 1 29 36 A 16 16 0 0 1 35 35 A 23 23 0 0 1 77 41 A 15 15 0 0 1 79 71 Z" fill="${C.white}" stroke="${C.ink}" stroke-width="${sw}" stroke-linejoin="round"/>`;

const sun = (cx, cy, r, rays = true) => {
  let s = "";
  if (rays) {
    const R1 = r + 5, R2 = r + 13;
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      s += `<line x1="${(cx + Math.cos(a) * R1).toFixed(1)}" y1="${(cy + Math.sin(a) * R1).toFixed(1)}" x2="${(cx + Math.cos(a) * R2).toFixed(1)}" y2="${(cy + Math.sin(a) * R2).toFixed(1)}" stroke="${C.yellow}" stroke-width="3.5" stroke-linecap="round"/>`;
    }
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.yellow}" stroke="${C.ink}" stroke-width="2"/>`;
  return s;
};

const dropsOrFlakes = (flake) =>
  [40, 56, 72]
    .map((x, i) =>
      flake
        ? `<circle cx="${x}" cy="${84 + (i % 2) * 4}" r="3.2" fill="${C.blue}"/>`
        : `<line x1="${x}" y1="78" x2="${x - 5}" y2="92" stroke="${C.blue}" stroke-width="4" stroke-linecap="round"/>`
    )
    .join("");

const SVGS = {
  clear: () => sun(50, 50, 19),
  partly: () => `${sun(37, 37, 13)}${cloud()}`,
  cloudy: () => cloud(),
  overcast: () =>
    `<path d="M 70 40 A 16 16 0 0 0 40 36" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>${cloud()}`,
  rain: () => `${cloud()}${dropsOrFlakes(false)}`,
  snow: () => `${cloud()}${dropsOrFlakes(true)}`,
  wind: () =>
    `<g fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round">
       <path d="M 20 42 H 60 A 9 9 0 1 0 51 33"/>
       <path d="M 20 56 H 74 A 10 10 0 1 1 64 66"/>
       <path d="M 20 70 H 50 A 8 8 0 1 1 43 78"/>
     </g>`,
  thunder: () =>
    `${cloud()}<polygon points="55,73 46,90 53,90 48,100 64,82 56,82 62,73" fill="${C.yellow}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>`,
  fog: () =>
    `${cloud()}<g stroke="${C.ink}" stroke-width="3.5" stroke-linecap="round"><line x1="30" y1="82" x2="72" y2="82"/><line x1="36" y1="92" x2="78" y2="92"/></g>`,
};

export function weatherSvg(kind) {
  const draw = SVGS[kind] || SVGS.cloudy;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 105" width="100" height="105">${draw()}</svg>`;
}

export function iconDataUri(kind) {
  return `data:image/svg+xml;base64,${Buffer.from(weatherSvg(kind)).toString("base64")}`;
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
