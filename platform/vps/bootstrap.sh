#!/usr/bin/env bash
# Prepare a Hostinger VPS to host containerized apps behind Traefik.
#
# Idempotent and safe to re-run. It will:
#   1. Install Docker Engine + the compose plugin if they are missing.
#   2. Create the shared external `web` Docker network if it does not exist.
#   3. Bring up Traefik (the shared HTTPS edge router) UNLESS a Traefik
#      container is already running — in which case it adopts the existing one
#      and leaves it untouched.
#
# On your current VPS (which already runs Traefik as `adam-traefik-1`) this is
# effectively a no-op: it confirms the `web` network exists and reports the
# running Traefik. On a fresh VPS it does the full install.
#
# Usage (run on the VPS as a user with Docker access):
#   ./bootstrap.sh
#   FORCE_TRAEFIK=1 ./bootstrap.sh   # start our Traefik even if none detected
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TRAEFIK_DIR="$SCRIPT_DIR/traefik"

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }

# --- 1. Docker ------------------------------------------------------------
if command -v docker >/dev/null 2>&1; then
  log "Docker already installed: $(docker --version)"
else
  log "Installing Docker Engine via get.docker.com"
  curl -fsSL https://get.docker.com | sh
  if command -v systemctl >/dev/null 2>&1; then
    systemctl enable --now docker || warn "could not enable docker service"
  fi
fi

if docker compose version >/dev/null 2>&1; then
  log "Docker Compose plugin present: $(docker compose version | head -1)"
else
  warn "The 'docker compose' plugin was not found. Install docker-compose-plugin"
  warn "for your distro, then re-run this script."
  exit 1
fi

# --- 2. Shared network ----------------------------------------------------
if docker network inspect web >/dev/null 2>&1; then
  log "Shared 'web' network already exists"
else
  log "Creating shared 'web' network"
  docker network create web
fi

# --- 3. Traefik -----------------------------------------------------------
# Detect any running Traefik container (by image), regardless of its name.
existing_traefik="$(docker ps --filter ancestor=traefik --format '{{.Names}}' | head -1 || true)"
if [ -z "$existing_traefik" ]; then
  # Fall back to a name match in case the image tag differs.
  existing_traefik="$(docker ps --format '{{.Names}}\t{{.Image}}' | awk -F'\t' 'tolower($2) ~ /traefik/ {print $1; exit}')"
fi

if [ -n "$existing_traefik" ] && [ "${FORCE_TRAEFIK:-0}" != "1" ]; then
  log "Adopting existing Traefik container: $existing_traefik"
  echo "    Leaving it as-is. New app containers will be routed by it as long as"
  echo "    it watches the 'web' network and offers a 'mytlschallenge' resolver."
  echo "    Set FORCE_TRAEFIK=1 to start the platform's own Traefik instead."
else
  if [ ! -f "$TRAEFIK_DIR/.env" ]; then
    warn "$TRAEFIK_DIR/.env not found — copying from .env.example."
    warn "Edit it to set ACME_EMAIL, then re-run."
    cp "$TRAEFIK_DIR/.env.example" "$TRAEFIK_DIR/.env"
    exit 1
  fi
  log "Starting platform Traefik"
  docker compose -f "$TRAEFIK_DIR/docker-compose.yml" --env-file "$TRAEFIK_DIR/.env" up -d
fi

log "Bootstrap complete"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
