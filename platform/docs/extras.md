# Optional extras

Off by default. Add them only if you want them.

## Watchtower — automatic image updates

Watchtower watches running containers and, when a newer image is available,
pulls it and recreates the container. Combined with `restart: unless-stopped`,
this keeps things patched with zero effort. Note: the platform's default deploy
**builds from source on the VPS**, so Watchtower mainly helps for apps that run
prebuilt/published images (e.g. `image: ghcr.io/...`).

Run it once on the VPS (it covers every container on the host):

```yaml
# ~/apps/watchtower/docker-compose.yml
services:
  watchtower:
    image: containrrr/watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command:
      # Check daily at 04:00; only touch containers that opt in via a label.
      - --schedule=0 0 4 * * *
      - --label-enable
      - --cleanup
```

```sh
docker compose -f ~/apps/watchtower/docker-compose.yml up -d
```

Opt a service in by adding to its compose labels:

```yaml
    labels:
      - com.centurylinklabs.watchtower.enable=true
```

## Volume backups — stateful apps

For apps with a named volume (databases, SQLite, uploads), back the volume up
on a schedule. Simple `tar` approach:

```sh
# /usr/local/bin/backup-volume.sh
#   backup-volume.sh <volume-name> <dest-dir>
set -euo pipefail
VOL="$1"; DEST="${2:-$HOME/backups}"
mkdir -p "$DEST"
STAMP="$(date +%Y%m%d-%H%M%S)"
docker run --rm -v "$VOL":/data:ro -v "$DEST":/backup alpine \
  tar czf "/backup/${VOL}-${STAMP}.tar.gz" -C /data .
# keep the 14 most recent
ls -1t "$DEST/${VOL}-"*.tar.gz | tail -n +15 | xargs -r rm -f
```

```sh
chmod +x /usr/local/bin/backup-volume.sh
# nightly at 03:30
( crontab -l 2>/dev/null; echo "30 3 * * * /usr/local/bin/backup-volume.sh my-app_data" ) | crontab -
```

For offsite/encrypted backups, swap the `tar` step for
[`restic`](https://restic.net/) pointed at object storage; the schedule stays
the same.

## Traefik dashboard (debugging)

To see routers/services/certs, expose Traefik's dashboard behind auth. Add to
the Traefik compose command list:

```
- --api.dashboard=true
```

and give the Traefik service a router + basic-auth middleware label set for a
`traefik.<domain>` host. Leave it off unless you're actively debugging.
