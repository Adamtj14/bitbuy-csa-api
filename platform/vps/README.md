# VPS bootstrap

One-time setup that turns a plain VPS into a host for containerized apps behind
a shared Traefik edge router with automatic HTTPS. After this, individual apps
never touch the host — they ship as containers and Traefik routes them.

## Two situations

### A. Your current VPS (already runs Traefik)

Your VPS already runs Traefik (`adam-traefik-1`) with the `web` network and the
`mytlschallenge` cert resolver — that's what `vestaboard` and `n8n` route
through. There is nothing to install. `bootstrap.sh` will simply **detect and
adopt** that Traefik and confirm the `web` network exists:

```sh
scp -r platform/vps user@VPS:~/platform-vps   # or git pull on the VPS
ssh user@VPS
cd ~/platform-vps && ./bootstrap.sh
```

New apps you deploy will be picked up by the existing Traefik automatically, as
long as they carry the standard labels (they do — see `platform/template`).

### B. A fresh VPS

```sh
cd platform/vps/traefik
cp .env.example .env        # set ACME_EMAIL
cd ..
./bootstrap.sh              # installs Docker, creates `web`, starts Traefik
```

`FORCE_TRAEFIK=1 ./bootstrap.sh` starts the platform's own Traefik even if some
other Traefik is detected (use only if you intend to replace it).

## What runs after bootstrap

- **Traefik** on ports 80/443. Port 80 redirects to 443. Certs are issued via
  the Let's Encrypt HTTP-01 challenge and stored on a named volume, so they
  survive restarts and renew automatically — no certbot, no cron.
- The **`web`** Docker network. Every app container joins it and Traefik
  discovers the app from its labels.

## Why this is low-maintenance

- **No host packages per app.** Each app declares its dependencies in its own
  Dockerfile. The host only ever needs Docker.
- **HTTPS renews itself.** Traefik handles issuance and renewal.
- **Self-healing.** `restart: unless-stopped` brings everything back after a
  reboot or crash.
