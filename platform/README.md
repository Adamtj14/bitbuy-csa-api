# platform

Scaffolding to build projects, push them to GitHub (public or private), and
deploy them to a Hostinger VPS with **automatic DNS, subdomains, and HTTPS** —
and as little devops as possible.

The idea: the VPS runs one shared **Traefik** edge router. Every app is a
container that attaches to a shared Docker network and advertises its subdomain
with a few labels. Traefik discovers it, routes the subdomain, and issues +
renews its TLS cert automatically. Deploys run from GitHub Actions over SSH, and
the subdomain's DNS record is created via the Hostinger API as part of the
deploy. Nothing to click, no certs to renew, no packages to install on the host.

```
  you ──push──▶ GitHub repo ──Actions──┐
                                        │ 1. upsert DNS  <sub>.<domain> ─▶ VPS   (Hostinger API)
                                        │ 2. ssh + docker compose up -d --build
                                        ▼
                       ┌──────────────────────────────────────────┐
                       │  Hostinger VPS                            │
                       │                                           │
   https://<sub>.<dom> │   Traefik  ──routes by Host label──▶ app  │
        ──── 443 ─────▶│   (auto HTTPS, auto renew)          (container) │
                       └──────────────────────────────────────────┘
```

## What's here

| Path | What it is |
| --- | --- |
| `vps/` | One-time VPS setup: `bootstrap.sh` + a Traefik compose. Adopts the Traefik you already run; full install on a fresh box. |
| `github/deploy.reusable.yml` | The reusable GitHub Actions workflow every project calls. Ensures DNS, then deploys. Single source of truth. |
| `github/deploy.caller.example.yml` | The tiny per-project workflow that calls the reusable one. |
| `template/` | Language-agnostic project template (Dockerfile + compose with Traefik labels + deploy workflow + docs). |
| `bin/new-project` | Generator: scaffold a project, create the GitHub repo (public/private), set deploy secrets, push. |
| `bin/publish-platform-repo` | One-off: publish this toolkit as its own `Adamtj14/platform` repo. |
| `bin/secrets.env.example` | Template for the shared deploy secrets. |

## Setup (once)

1. **Publish this toolkit as its own repo** so projects can reference the
   reusable workflow:
   ```sh
   platform/bin/publish-platform-repo            # creates Adamtj14/platform (private)
   ```
2. **Prepare the VPS** (adopts your existing Traefik; no-op if it's already up):
   ```sh
   # on the VPS, from a checkout of the platform repo
   ./vps/bootstrap.sh
   ```
3. **Store your deploy secrets once**, locally:
   ```sh
   mkdir -p ~/.config/platform
   cp platform/bin/secrets.env.example ~/.config/platform/secrets.env
   chmod 600 ~/.config/platform/secrets.env
   # fill in VPS_SSH_KEY, HOSTINGER_API_TOKEN, etc.
   ```

## New project (each time)

```sh
platform/bin/new-project my-app --subdomain my-app --domain ccml.cloud --port 8080 --visibility private
```

That scaffolds `./my-app`, creates the GitHub repo, sets the deploy secrets on
it, and pushes `main` — which triggers the first deploy. A minute or two later
`https://my-app.ccml.cloud` is live over HTTPS. Then just edit the `Dockerfile`
to run your real app and push.

Make it public instead with `--visibility public`. Point it at a different
apex domain (that Hostinger manages) with `--domain`.

## Secrets checklist (per project, set for you by `new-project`)

| Secret | Purpose |
| --- | --- |
| `VPS_HOST` | SSH host (IP or hostname) |
| `VPS_USER` | SSH user |
| `VPS_SSH_KEY` | SSH private key |
| `VPS_PORT` | SSH port (optional, default 22) |
| `VPS_PUBLIC_IP` | IPv4 for the DNS A record (defaults to `VPS_HOST` if it's an IP) |
| `HOSTINGER_API_TOKEN` | Hostinger API token for DNS |

## Why it stays low-maintenance

- **Containers, not host packages.** Each app carries its own dependencies in
  its Dockerfile. The VPS host only needs Docker — you never install per-app
  packages on it.
- **HTTPS is automatic and self-renewing** via Traefik + Let's Encrypt.
- **DNS is automated** in the deploy via the Hostinger API.
- **Self-healing**: `restart: unless-stopped` restores services after reboots.
- **One place to improve.** Deploy logic lives in the reusable workflow; fix it
  once and every project benefits — no per-repo edits.

## Optional extras

See [`docs/extras.md`](docs/extras.md) for:

- **Watchtower** — automatically pull and restart updated container images.
- **Volume backups** — a cron + `tar`/`restic` recipe for stateful apps.
