# Vestaboard Studio

Self-controlled system for a Vestaboard split-flap display (6 rows × 22 columns):
a web app to design and manage slides, and a local agent that pushes them to the
board over its LAN-only Local API.

```
┌────────────────────────────┐        ┌──────────────────────────────┐
│  Web app (Vite + React)    │        │  Local agent (Node, on a Pi) │
│  hosted on the VPS         │ config │  - pulls slides.json         │
│  - painter / slide editor  │───────▶│  - renders current slide     │
│  - live board preview      │        │  - pushes 6x22 grid to board │
│  - rotation settings       │        └──────────────┬───────────────┘
└────────────┬───────────────┘                       │ LAN only
             │ shared render library                 ▼
             └──────────▶ @vestaboard/core ◀── http://vestaboard.local:7000
```

Both the preview and the agent call the **same** pure `render(slideConfig, ctx)`
function from `@vestaboard/core`, so what you see in the browser is exactly what
the board shows.

## Packages

| Path | What it is |
| --- | --- |
| `packages/core` | Pure render library: character codes, 6×22 grid helpers, text layout, and the clock / ticker / painter slide renderers. No I/O. |
| `packages/data` | Ticker quote providers: Bitbuy CSA feed (crypto, CAD pairs), Yahoo Finance (US + TMX stocks), and a deterministic mock. |
| `apps/agent` | Daemon for a Raspberry Pi on the board's LAN: rotation scheduler + Local API client. |
| `apps/web` | Vestaboard Studio web app: slide manager, per-slide editors, painter canvas, split-flap preview. |

## Hardware constraints (why things work the way they do)

- The board accepts **character arrays only** — a 6×22 grid of numeric codes
  (letters, digits, punctuation, color chips 63–71). See `packages/core/src/chars.ts`
  for the verified map.
- The board ignores repeat messages within **~15 seconds** (it is physical
  hardware flipping flaps) and its API returns 503 inside that window. The
  rotation engine clamps frequency to 15s and treats 503 as "retry next tick".
- Clocks are minute-granularity: the agent wakes at least once a minute and
  re-renders the current slide, but only pushes when the grid actually changed.
- The Local API natively supports flip **transition strategies**
  (`column`, `reverse-column`, `edges-to-center`, `row`, `diagonal`, `random`) —
  selectable per slide in the editor.

## One-time board setup (Local API enablement)

1. Request an enablement token at <https://www.vestaboard.com/local-api>
   (board must be paired and online). The token arrives by email.
2. Exchange it for a permanent local API key — run this on the board's LAN:

   ```sh
   curl -X POST http://vestaboard.local:7000/local-api/enablement \
     -H "X-Vestaboard-Local-Api-Enablement-Token: YOUR_TOKEN"
   ```

   The response contains `"apiKey": "..."` — that's `VESTABOARD_LOCAL_KEY`.
3. Give the board a static IP / DHCP reservation (IPv4 required) and set
   `BOARD_HOST` to it if mDNS (`vestaboard.local`) is unreliable.

## Development

```sh
cd vestaboard
npm install
npm test              # render library, providers, rotation engine
npm run build         # all workspaces
npm run dev -w @vestaboard/web    # Studio at http://localhost:5173
```

### Try the agent without a board

```sh
cd apps/agent
npm run build -w @vestaboard/agent
MOCK_QUOTES=1 node dist/index.js --dry-run --config slides.example.json
```

`--dry-run` prints each would-be push as ASCII art. Design slides in the Studio,
**Export slides.json**, and feed that file to the agent.

## Running the agent on the Pi

```sh
# on the Pi, inside this repo
cd vestaboard && npm install && npm run build
BOARD_HOST=192.168.1.40 \
VESTABOARD_LOCAL_KEY=xxxx \
node apps/agent/dist/index.js --config /home/pi/slides.json
```

Environment:

| Var | Meaning |
| --- | --- |
| `BOARD_HOST` | Board IP or hostname (default `vestaboard.local`) |
| `VESTABOARD_LOCAL_KEY` | Local API key from enablement |
| `CONFIG_URL` | Pull config from a URL (e.g. the hosted Studio) instead of a file; re-polled every 60s |
| `CSA_FEED_URL` | Bitbuy CSA feed URL for crypto quotes |
| `MOCK_QUOTES=1` | Deterministic fake quotes (dev/offline) |

Sample systemd unit (`/etc/systemd/system/vestaboard-agent.service`):

```ini
[Unit]
Description=Vestaboard agent
After=network-online.target

[Service]
Environment=BOARD_HOST=192.168.1.40
Environment=VESTABOARD_LOCAL_KEY=xxxx
Environment=CONFIG_URL=https://ccml.ai/vestaboard/api/config
ExecStart=/usr/bin/node /home/pi/bitbuy-csa-api/vestaboard/apps/agent/dist/index.js
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

## Deploying the Studio to the VPS (ccml.ai)

The Studio currently builds to static files (config lives in localStorage +
import/export). On the Hostinger VPS:

```sh
cd vestaboard && npm install && npm run build
# serve apps/web/dist behind Caddy or nginx
```

Caddy example:

```
ccml.ai {
    root * /srv/vestaboard/web
    file_server
}
```

When the hosted config API lands (next phase), the agent's `CONFIG_URL` points
at it and admin changes apply without touching the Pi.

## What's deferred (next phases)

- Google OAuth, invites, admin/member roles
- Hosted config API + DB on the VPS (so `CONFIG_URL` replaces file export)
- Weather (Open-Meteo), news (RSS), sports (ESPN scoreboard) slides
- Preview-side animated transitions; wipe frames on the board
- Confirming the eink display's exact ticker provider and mirroring it
  (providers are pluggable — see `packages/data/src/provider.ts`)
