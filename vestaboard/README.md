# Vestaboard Studio

Self-controlled system for a Vestaboard split-flap display — both the flagship
(6 rows × 22 columns) and the Vestaboard Note (3 × 15) — with a web app to
design and manage slides and a local agent that pushes them to the board over
its LAN-only Local API.

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
| `packages/core` | Pure render library: character codes, 6×22 grid helpers, text layout, shared zod config schema, the slide renderers (clock, world clock, ticker, painter, message, weather, multi-weather, news, sports), and scheduling helpers. No I/O. |
| `packages/data` | Data fetchers: CoinGecko (crypto, CAD/USD pairs, keyless), Yahoo Finance (US + TMX stocks), Open-Meteo weather, RSS/Atom headlines, ESPN scoreboards, plus deterministic mocks. |
| `apps/agent` | Daemon for a Raspberry Pi on the board's LAN: rotation scheduler, per-type data hub with TTL caching, Local API client. |
| `apps/server` | Hosted API on the VPS: Google OAuth, invites + admin/member roles, SQLite-backed board config, bearer-token endpoint the agent polls. |
| `apps/web` | Vestaboard Studio web app: sign-in, slide manager, per-slide editors, painter canvas, split-flap preview, people/invites admin. |

## Hardware constraints (why things work the way they do)

- The board accepts **character arrays only** — a grid of numeric codes
  (letters, digits, punctuation, color chips 63–71): 6×22 on the flagship,
  3×15 on the Vestaboard Note. See `packages/core/src/chars.ts` for the
  verified map.
- The **board model** is a config setting (Board → Model in the Studio,
  `boardModel` in slides.json). Every renderer adapts: the Note drops title
  rows and the ticker's percent column, the big-digital clock falls back to
  centered text, weather shows the summary without the forecast rows.
  Painter slides are drawn per-model — a grid painted for one model shows
  blank on the other.
- The board ignores repeat messages within **~15 seconds** (it is physical
  hardware flipping flaps) and its API returns 503 inside that window. The
  rotation engine clamps frequency to 15s and treats 503 as "retry next tick".
- Clocks are minute-granularity: the agent wakes at least once a minute and
  re-renders the current slide, but only pushes when the grid actually changed.
- The Local API natively supports flip **transition strategies**
  (`column`, `reverse-column`, `edges-to-center`, `row`, `diagonal`, `random`) —
  selectable per slide in the editor. The Studio previews each one with a
  staggered flap animation (**Transition demos** in the header, and a live
  demo under each slide's transition picker); the board firmware performs the
  real flip. The ordering is a pure, tested helper (`transitionSteps` in
  `packages/core`) shared by every preview.

## Scheduling, compose, and the news digest

- **Schedules & sleep hours** — each slide can carry a day/time window (Board →
  a slide's *Schedule*); outside it the slide drops out of rotation. A board-wide
  **Sleep hours** window blanks the board entirely (no overnight flap wear). Both
  are evaluated in the board's **Time zone** (Board panel; defaults to the host's
  zone). The pure helpers live in `packages/core/src/schedule.ts` and are shared
  by the server pusher and the Pi agent.
- **Message the board** — a compose box pinned to the top of the home screen
  (admins). Posting drives a single **Message** slide at the front of the
  rotation; Clear removes it.
- **Pinned slides** — pin a slide (📌 in the slide list or its editor) to show
  it **after every regular slide**, so it appears more often: regulars {1,2,4}
  with pins {3,5} play `1,3,5, 2,3,5, 4,3,5`. Pure `rotationSequence` in
  `packages/core/src/schedule.ts`, shared by the pusher and the agent.
- **Live-score interrupt** — a sports slide with **followed teams** watches those
  games; when a score changes, that slide overtakes the board immediately, holds
  for one rotation interval, then the normal rotation resumes one slide onward.
  The server polls scores ~every 30s (faster while a followed game is live).
- **News digest** — a news slide's *Mode* can be **AI digest**: headlines are
  distilled by Claude into board-sized lines, cached and refreshed every ~2h.
  Set an **Anthropic API key** in Settings to enable it (default model
  `claude-haiku-4-5`; ~12 tiny calls/day). Without a key, news shows raw
  headlines.

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
npm test              # render library, providers, rotation engine, server API
npm run build         # all workspaces

# terminal 1 — API server (Node >= 22.5 for node:sqlite)
SESSION_SECRET=dev DEV_FAKE_AUTH=1 AGENT_TOKEN=dev-agent npm run dev -w @vestaboard/server

# terminal 2 — Studio at http://localhost:5173 (proxies /api + /auth to :8787)
npm run dev -w @vestaboard/web
```

With `DEV_FAKE_AUTH=1` you can sign in without Google at
`http://localhost:5173/auth/dev?email=you@example.com&name=You` (first user
becomes admin). Never enable it in production.

### Users, invites and roles

- The **first person to sign in becomes admin**.
- Everyone else needs an **invite**: an admin adds their email under People →
  Invites; they then sign in with Google using that email.
- **Admins** control rotation, all slides, ordering, people and invites.
- **Members** can create and edit their own painter slides and preview
  everything; an admin flips their slide into the rotation.

### Try the agent without a board

```sh
cd apps/agent
npm run build -w @vestaboard/agent
MOCK_QUOTES=1 node dist/index.js --dry-run --config slides.example.json
```

`--dry-run` prints each would-be push as ASCII art. Design slides in the Studio,
**Export slides.json**, and feed that file to the agent.

## Google OAuth setup (one-time)

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an
   **OAuth client ID** (type: Web application).
2. Authorized redirect URI: `https://ccml.ai/auth/google/callback` (plus
   `http://localhost:8787/auth/google/callback` for local testing).
3. Put the client ID/secret in the server env (`GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`).

## Pushing to the board

Two ways to get rendered slides onto the physical board:

### A. Cloud push from the server (no LAN device)

The hosted server renders the active slide and pushes it to the board over
Vestaboard's Read-Write / Cloud API on the rotation interval — same behaviour
as the agent (15s floor, identical-grid skip, minute clock refresh, stale-data
fallback), but nothing needs to run on the board's network.

Set the key **in the Studio** (recommended): sign in as an admin, open
**Settings**, enable the Read-Write API in the API tab at
<https://web.vestaboard.com>, and paste the token. Cloud push starts within a
few seconds — no redeploy. The Settings screen shows live status (pushing /
last slide / errors). The key is stored in the SQLite volume, so it survives
restarts. Advanced fields cover accounts on the older `rw.vestaboard.com` /
`X-Vestaboard-Read-Write-Key` pairing.

Prefer env/secrets? Set `VESTABOARD_RW_KEY` (and optionally
`VESTABOARD_API_URL` / `VESTABOARD_AUTH_HEADER`); on first boot the server
seeds these into the DB, after which the Settings screen is the source of
truth. Either way the server logs `[pusher] pushed "<slide>"` on each update.

Crypto quotes come from **CoinGecko** (free, no key). An optional
`COINGECKO_API_KEY` (or the Settings field) raises the rate limit.

Trade-off: this depends on Vestaboard's cloud and the internet. For a pure
LAN, no-cloud setup, use the Pi agent below instead.

### B. Local agent on the Pi (LAN only)

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
| `CONFIG_URL` | Pull config from the hosted server (e.g. `https://ccml.ai/api/agent/config`); re-polled every 60s |
| `CONFIG_TOKEN` | Bearer token for `CONFIG_URL` — must equal the server's `AGENT_TOKEN` |
| `COINGECKO_API_KEY` | Optional CoinGecko demo key (crypto works without it) |
| `MOCK_DATA=1` | Deterministic fake data for every slide (dev/offline) |

Sample systemd unit (`/etc/systemd/system/vestaboard-agent.service`):

```ini
[Unit]
Description=Vestaboard agent
After=network-online.target

[Service]
Environment=BOARD_HOST=192.168.1.40
Environment=VESTABOARD_LOCAL_KEY=xxxx
Environment=CONFIG_URL=https://ccml.ai/api/agent/config
Environment=CONFIG_TOKEN=xxxx
ExecStart=/usr/bin/node /home/pi/bitbuy-csa-api/vestaboard/apps/agent/dist/index.js
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

## Deploying to the VPS (ccml.ai) with Docker

The image bundles the API server and the built Studio; SQLite lives on a
named volume so upgrades keep your users and slides.

```sh
# on the VPS
git clone https://github.com/Adamtj14/bitbuy-csa-api.git
cd bitbuy-csa-api/vestaboard
cp .env.example .env        # fill in secrets + Google OAuth client
docker compose up -d --build
```

`.env` needs: `BASE_URL=https://ccml.ai`, `SESSION_SECRET` and `AGENT_TOKEN`
(`openssl rand -hex 32` / `-hex 24`), and the Google OAuth client
(`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — redirect URI
`https://ccml.ai/auth/google/callback`).

Point your existing reverse proxy at the container. Caddy example:

```
ccml.ai {
    reverse_proxy localhost:8787
}
```

To redeploy after a change:

```sh
git pull && docker compose up -d --build
```

The Pi agent then points `CONFIG_URL=https://ccml.ai/api/agent/config` with
`CONFIG_TOKEN` equal to the server's `AGENT_TOKEN`; admin changes in the
Studio reach the board within a minute, no Pi redeploys.

(Prefer bare Node? The pre-Docker systemd instructions still work: run
`node apps/server/dist/index.js` with the same env vars, Node >= 22.5.)

## What's deferred (next phases)

- Optional wipe frames on the board itself (preview-side transition
  animations are done — see the hardware-constraints section)
- Confirming the eink display's eventual stock provider and sharing it
  (providers are pluggable — see `packages/data/src/provider.ts`)
- Postgres migration if SQLite ever outgrows the VPS (unlikely for this scale)
