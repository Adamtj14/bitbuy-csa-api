# Family E-Ink Dashboard — Handoff

> Context dump for continuing this project in a **local** Claude Code session
> (so the filesystem, your photos, and a real browser are all directly available).
> Everything described here is committed on branch **`claude/eink-home-dashboard-76B9e`**.

## What we're building
A **family command-center dashboard** that renders as a single image and is shown on a
**Seeed XIAO ePaper Kit EE02** — a 13.3" **Spectra 6** e-ink panel, **1600×1200**, 6 colors
only: black / white / red / yellow / green / blue.

**Orientation: portrait** → we design at **1200 (w) × 1600 (h)**.

Content the dashboard shows: time + date, weather (current + today temp/precip graph +
7‑day), calendar (mini month + next‑7 + today's agenda), a rotating family photo, stock/
crypto tickers, and family notes.

## Key decisions (locked)
- **Do NOT use SenseCraft's native widgets.** A server renders the *whole* dashboard as one
  image; the device just displays it. Transport (SenseCraft as a dumb "picture frame" that
  pulls our image URL, vs. custom ESP32‑S3 firmware) is **deferred + reversible** — the
  renderer is identical either way.
- **Render with real HTML/CSS via headless Chromium** (Playwright), not Satori. Full CSS,
  fast iteration. (An older Satori prototype still exists but is legacy — see below.)
- **6‑color reality:** there are NO grays. A gray dithers into colored speckle. So use
  **pure black** (`#000`) for text/lines and solid palette colors for fills. Black fills are
  perfectly crisp. Color fills get slight dither texture.
- **Dithering is a post‑process and currently OFF** during design. Re-enable with `DITHER=1`.
  We'll lock the look first, then tune the Floyd–Steinberg dither (`lib/dither.js`).

## Current status
We explored two rounds of styles. The user rejected the first (conventional) round and asked
to "be creative." The **current/active set = 7 creative concepts**, delivered as self-contained
HTML. The user is choosing a direction; refinement is ongoing. No live data yet (sample data).

### The 7 creative concepts (active) — `lib/styles/`
| file | concept |
|---|---|
| `riso.js` | **Risograph poster** — overlapping flat color blobs (multiply), grain, huge type |
| `family-times.js` | **The Family Times** — B/W newspaper front page, Playfair masthead, drop cap |
| `photo-cover.js` | **Photo cover** — family photo full-bleed, time/weather/agenda over scrims |
| `departure.js` | **Departure board** — split-flap station schedule, mono, statuses, ticker |
| `bauhaus.js` | **Bauhaus / Mondrian** — rigid primary-color blocks, thick black rules |
| `terminal.js` | **Terminal** — CRT command-line, green-on-black, ASCII banner |
| `blueprint.js` | **Blueprint** — white-on-blue technical schematic, graph-paper grid, title block |

Legacy first-round styles (kept, not in default render set): `dark-hero.js`, `bento.js`,
`editorial.js`, `color-block.js`.

## Repo layout
```
api/csa-feed.js        Existing Vercel stub (Bitbuy tickers, prices all 0) — untouched
vercel.json            Vercel config for the stub
package.json           ESM ("type":"module"); deps below
lib/
  styles/
    index.js           Registry: STYLES = { name: html(data) }  (the 7 active concepts)
    _common.js         Shared: embedded @font-face (FONT_CSS/SERIF_CSS/MONO_CSS),
                       icon(), graphSvg() (smooth Catmull-Rom curve), monthWeeks(),
                       photoDataUri(), pageShell(), esc()
    riso.js … blueprint.js, + legacy dark-hero/bento/editorial/color-block
  sampleData.js        Mock data (weather/calendar/stocks/notes/photo) — shape mirrors future live data
  icons.js             Meteocons "line" icons (@bybas/weather-icons), animations stripped,
                       recolored palette-safe (cloud→black, sun→yellow, rain→blue)
  graph.js             (older standalone graph for the Satori path)
  dither.js            Floyd–Steinberg → Spectra-6 palette (reused; currently opt-in)
  dashboard.js         LEGACY Satori layout (first refined version)
scripts/
  html.js              Writes self-contained out/<style>.html  (NO browser needed) ← main loop
  render.js            Chromium screenshot → out/<style>.png (+ -eink.png if DITHER=1)
  preview.js           LEGACY Satori → PNG
assets/                Put photo.jpg here (see "Photo" below). Currently empty.
out/                   Generated previews (gitignored)
```

## How to run
```bash
npm install
node scripts/html.js                 # → out/*.html  (open in any browser; fast, no deps)
node scripts/html.js riso            # just one style
DITHER=1 node scripts/render.js      # → out/*.png + out/*-eink.png (needs Chromium)
```

### ⚠ Local gotcha — Chromium path
`scripts/render.js` defaults `CHROME_PATH` to `/opt/pw-browsers/chromium` (the cloud sandbox).
Locally, either:
- run `npx playwright install chromium` and set `CHROME_PATH=$(node -e "console.log(require('playwright-core').chromium.executablePath())")`, **or**
- switch `render.js` to the full `playwright` package and drop `executablePath`, **or**
- just use `scripts/html.js` (HTML previews need no browser at all).
*(First task for the local session: make `render.js` auto-detect Chromium.)*

Dependencies: `playwright-core`, `pngjs`, `@bybas/weather-icons`, `@fontsource/inter`,
`@fontsource/playfair-display`, `@fontsource/ibm-plex-mono` (+ legacy `satori`, `@resvg/resvg-js`).

## Photo (immediate next step)
Plumbing is done: `_common.photoDataUri()` embeds `assets/photo.{jpg,jpeg,png,webp}` if present;
Photo-cover uses it full-bleed, Family Times renders it grayscale. It falls back to a drawn
scene when absent. The user has a photo at `~/Desktop/IMG_1700.jpg` (an "Out of Office" cap shot).
**Local session: copy it in and re-render:**
```bash
mkdir -p assets && cp ~/Desktop/IMG_1700.jpg assets/photo.jpg
node scripts/html.js photo-cover family-times   # (or run all)
```

## Deferred / future work
- **Pick a style direction** (user is mid-decision across the 7). Then refine; can expose
  `?style=` to keep several switchable.
- **Live data:** weather = **Open-Meteo** (free, no key); calendar = shared Google calendar
  **private ICS URL** (no OAuth); stocks = a quote API (e.g. Finnhub) with an easy-to-edit
  ticker list; **notes** = Apple Notes has no public API → use an **Apple Shortcut** that POSTs
  to our endpoint (or a shared Google Sheet/Keep).
- **Endpoint:** build `/api/dashboard.png` that renders the chosen style from live data.
- **Re-enable + tune dithering** for the final Spectra-6 output.
- **Transport decision:** SenseCraft picture-frame (no flashing) vs. custom ESP32-S3 firmware
  (Seeed_GFX; fetch image over WiFi, deep-sleep). Reversible; decide later.

## Sample data
`lib/sampleData.js` — a Toronto family, Saturday June 27 2026, 2:32 PM. Its shape is the
contract for future live data (swap the source, keep the shape).

## Git
- Branch: **`claude/eink-home-dashboard-76B9e`** (everything is here; `main` is the old stub).
- Remote: `github.com/Adamtj14/bitbuy-csa-api`.
- `out/` and `node_modules/` are gitignored.
