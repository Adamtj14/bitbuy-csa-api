// Floyd-Steinberg dithering to the Spectra 6 palette (black/white/red/yellow/blue/green).
// Operates on an RGBA buffer in place-ish and returns a new RGBA buffer.

export const SPECTRA6 = [
  [0, 0, 0],       // black
  [255, 255, 255], // white
  [200, 30, 30],   // red
  [232, 200, 0],   // yellow
  [27, 83, 192],   // blue
  [30, 140, 58],   // green
];

function nearest(r, g, b, palette) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const dr = r - palette[i][0];
    const dg = g - palette[i][1];
    const db = b - palette[i][2];
    const d = dr * dr + dg * dg + db * db;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return palette[best];
}

export function dither(rgba, width, height, palette = SPECTRA6) {
  // work in float RGB for error diffusion
  const buf = new Float32Array(width * height * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    buf[j] = rgba[i];
    buf[j + 1] = rgba[i + 1];
    buf[j + 2] = rgba[i + 2];
  }

  const out = Buffer.alloc(width * height * 4);
  const idx = (x, y) => (y * width + x) * 3;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = idx(x, y);
      const r = buf[p], g = buf[p + 1], b = buf[p + 2];
      const nc = nearest(r, g, b, palette);
      const er = r - nc[0], eg = g - nc[1], eb = b - nc[2];

      const o = (y * width + x) * 4;
      out[o] = nc[0];
      out[o + 1] = nc[1];
      out[o + 2] = nc[2];
      out[o + 3] = 255;

      const spread = (dx, dy, f) => {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) return;
        const np = idx(nx, ny);
        buf[np] += er * f;
        buf[np + 1] += eg * f;
        buf[np + 2] += eb * f;
      };
      spread(1, 0, 7 / 16);
      spread(-1, 1, 3 / 16);
      spread(0, 1, 5 / 16);
      spread(1, 1, 1 / 16);
    }
  }
  return out;
}
