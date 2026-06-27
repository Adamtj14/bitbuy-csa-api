// Today's hourly temperature line (red) + precipitation bars (blue), drawn light
// and clean. Returned as a data URI for an <img>. Palette-safe for the 6-color panel.

const RED = "#C8302A";
const BLUE = "#2156C0";
const INK = "#111111";
const FONT = "Liberation Sans"; // resvg rasterizes this inline SVG, so use a system font

export function graphDataUri(hours, W = 1120, H = 180) {
  const padL = 6, padR = 6, padT = 24, padB = 26;
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
  const yP = (p) => (p / pMax) * (innerH * 0.7);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;

  // baseline (thin)
  svg += `<line x1="${padL}" y1="${padT + innerH}" x2="${W - padR}" y2="${padT + innerH}" stroke="${INK}" stroke-width="1"/>`;

  // precipitation bars
  const bw = Math.min(34, Math.max(10, innerW / n - 26));
  hours.forEach((d, i) => {
    if (d.p > 0) {
      const bh = yP(d.p);
      svg += `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${(padT + innerH - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${BLUE}" rx="4"/>`;
    }
  });

  // temperature line (slim)
  const pts = hours.map((d, i) => `${x(i).toFixed(1)},${yT(d.t).toFixed(1)}`).join(" ");
  svg += `<polyline points="${pts}" fill="none" stroke="${RED}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;

  hours.forEach((d, i) => {
    const px = x(i), py = yT(d.t);
    svg += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="${RED}"/>`;
    svg += `<text x="${px.toFixed(1)}" y="${(py - 11).toFixed(1)}" font-family="${FONT}" font-size="17" font-weight="600" fill="${INK}" text-anchor="middle">${d.t}°</text>`;
    svg += `<text x="${px.toFixed(1)}" y="${H - 7}" font-family="${FONT}" font-size="15" fill="${INK}" text-anchor="middle">${d.h}</text>`;
  });

  svg += `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
