# SpaceIQ Booker

Automatically books **a specific seat** in SpaceIQ (Eptura) on **recurring
weekdays**, on a rolling basis, from your own laptop.

You can book at most 2 weeks ahead, so this runs every weekday morning and makes
sure your seat is reserved for your chosen weekdays across the whole 14-day
window — grabbing each new day the moment it opens, and catching up on anything
still unbooked if the laptop happened to be asleep.

## How it handles Microsoft SSO (important)

Your company uses **Microsoft SSO** (and probably MFA). This tool **never stores
your corporate password and never scripts the Microsoft login** — that would be
fragile and is usually against IT policy.

Instead it uses a **persistent browser profile**:

1. **Once**, you log in by hand in a real browser window (SSO + MFA and all).
2. The session is saved in a local `.session/` folder.
3. Every scheduled run **reuses that logged-in session** — no password needed.
4. When the session eventually expires (weeks later), you just run the one-time
   login again.

`.session/` is your live login. It's git-ignored and must never be committed or
shared.

## Install

Requires Node 20+.

```bash
cd spaceiq-booker
npm install
npx playwright install chromium   # one-time browser download
cp config.example.json config.json
```

## First-time setup (about 5 minutes)

### 1. Log in once

```bash
npm run login
```

A browser opens. Sign in through Microsoft SSO until you can see the seat-booking
screen, then return to the terminal and press Enter.

> Also confirm the URL in the address bar matches `baseUrl` in `config.json`.
> Tenants differ (e.g. `app.spaceiq.com`, `apollo.spaceiq.com`, or a company
> subdomain). Fix `baseUrl` if needed.

### 2. Discovery step — teach it your tenant's booking call

This is the one part I can't pre-fill, because it depends on your company's
SpaceIQ instance. SpaceIQ's web app talks to a **GraphQL API**; booking a seat
fires a "create reservation" mutation. We capture that once:

```bash
npm run discover
```

The browser opens on your session. **Book your seat once, by hand.** As you
click, the terminal logs each GraphQL operation, and everything is saved to
`capture/graphql.log.json`. Look for the operation logged at the moment you
confirmed — its name usually looks like `createReservation`, `bookDesk`, or
`createBooking`.

Copy the details into `config.json`:

- `seatId` — the desk/seat id from that operation's variables (and `seatLabel`
  for readable logs).
- `buildingId` / `floorId` — only if the mutation needs them.
- `booking.graphqlPath` — the endpoint path (e.g. `/graphql`).
- `booking.mutation` — the mutation string.
- `booking.variables` — the variable shape, using `{{seatId}}`, `{{date}}`,
  `{{buildingId}}`, `{{floorId}}` placeholders where those values go. `{{date}}`
  is filled per target day as `YYYY-MM-DD` (adjust the format if your tenant
  expects something else).
- `booking.authTokenStorageKey` — usually leave blank (cookies are reused
  automatically). Only set it if booking fails with an auth error *and* you can
  see a bearer token stored under a known key in the app's localStorage.

> Not sure which operation is the booking one? Send me `capture/graphql.log.json`
> (redact anything sensitive) and I'll wire `config.json` for you.

### 3. Set your weekdays and seat

In `config.json`:

```json
"weekdays": ["Tue", "Thu"],
"horizonDays": 14
```

### 4. Dry run, then a real run

```bash
npm run status                 # shows exactly which dates it would target
SPACEIQ_DRY_RUN=1 npm run book # does everything except confirm
npm run book                   # the real thing
```

## Schedule it (weekday mornings)

Pick your OS — files are in `scheduling/`:

- **macOS**: `com.spaceiq.booker.plist` (launchd — re-runs after the laptop
  wakes, best for a laptop).
- **Linux / macOS**: `crontab.txt`.
- **Windows**: `windows-task.md` (Task Scheduler, with wake-to-run).

Each runs `book` at 08:05 Mon–Fri. Because every run sweeps the full window and
skips days already booked, an occasional missed morning self-corrects the next
day.

## Commands

| Command | What it does |
| --- | --- |
| `npm run login` | One-time manual SSO login; saves the session. |
| `npm run discover` | Capture your tenant's booking API (run once). |
| `npm run status` | Print the dates it would target right now. |
| `npm run book` | Book all target weekdays in the window (skips existing). |
| `npm test` | Unit tests for the date-window logic. |

## Environment overrides

- `SPACEIQ_HEADED=0` — run the browser invisibly (used by the schedulers).
- `SPACEIQ_DRY_RUN=1` — go through the motions without confirming.
- `SPACEIQ_CONFIG=/path/to/config.json` — use a different config file.

## Troubleshooting

- **"Not logged in"** — the session expired. Run `npm run login` again.
- **Booking fails with an auth error** — try setting `booking.authTokenStorageKey`
  (see step 2), or re-run `login`.
- **Wrong dates / nothing targeted** — check `weekdays`, `horizonDays`, and your
  machine's timezone/clock; dates use local time on purpose.
- **Screenshots of failures** land in `screenshots/` for debugging.

## What's yours vs. what's shared

Committed to git: the code, examples, schedulers, docs. **Never** committed:
`config.json`, `.session/`, `capture/`, `screenshots/` (all git-ignored). Your
login and any seat ids stay on your machine.
