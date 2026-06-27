// Today's hourly temperature line (red) + precipitation bars (blue) as a bold SVG,
// returned as a data URI for an <img>. Palette-safe for the 6-color panel.

const RED = "#C81E1E";
const BLUE = "#1B53C0";
const INK = "#000000";

export function graphDataUri(hours, W = 560, H = 210) {
  const padL = 8, padR = 12, padT = 26, padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = hours.length;

  const temps = hours.map((d) => d.t);
  const tMin = Math.min(...temps);
  const tMax = Math.max(...temps);
  const tSpan = Math.max(1, tMax - tMin);
  const pMax = Math.max(1, ...hours.map((d) => d.p));

  const x = (i) => padL + (innerW * i) / (n - 1);
  const yT = (t) => padT + innerH - ((t - tMin) / tSpan) * innerH;
  const yP = (p) => (p / pMax) * innerH;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  svg += `<rect x="0" y="0" width="${W}" height="${H}" fill="#FFFFFF"/>`;

  // baseline
  svg += `<line x1="${padL}" y1="${padT + innerH}" x2="${W - padR}" y2="${padT + innerH}" stroke="${INK}" stroke-width="2"/>`;

  // precipitation bars
  const bw = Math.max(8, innerW / n - 14);
  hours.forEach((d, i) => {
    if (d.p > 0) {
      const bh = yP(d.p);
      svg += `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${(padT + innerH - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${BLUE}" rx="3"/>`;
    }
  });

  // temperature line
  const pts = hours.map((d, i) => `${x(i).toFixed(1)},${yT(d.t).toFixed(1)}`).join(" ");
  svg += `<polyline points="${pts}" fill="none" stroke="${RED}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`;

  // temperature dots + labels, hour labels
  hours.forEach((d, i) => {
    const px = x(i), py = yT(d.t);
    svg += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5" fill="${RED}"/>`;
    svg += `<text x="${px.toFixed(1)}" y="${(py - 12).toFixed(1)}" font-family="DejaVu Sans" font-size="20" font-weight="700" fill="${INK}" text-anchor="middle">${d.t}°</text>`;
    svg += `<text x="${px.toFixed(1)}" y="${H - 8}" font-family="DejaVu Sans" font-size="18" fill="${INK}" text-anchor="middle">${d.h}</text>`;
  });

  svg += `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
