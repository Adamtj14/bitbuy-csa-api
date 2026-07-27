# __NAME__

Deployed at **https://__SUBDOMAIN__.__DOMAIN__**

Generated from the [platform](https://github.com/Adamtj14/platform) template.
It runs as a container on the VPS behind Traefik, which handles HTTPS and
subdomain routing automatically.

## Deploy

Push to `main` (or run the **Deploy** workflow manually). CI will:

1. Ensure the DNS record `__SUBDOMAIN__.__DOMAIN__ → VPS` exists.
2. Build and start the container on the VPS.
3. Traefik issues/renews the TLS cert and routes the subdomain.

No manual DNS, certs, or server package installs.

## Run locally

```sh
cp .env.example .env
docker compose up --build
# app is published on http://127.0.0.1:__PORT__
```

## Make it your app

Edit the `Dockerfile` to build and run your real service. The only contract:
the container must listen on the port set as `APP_PORT` / `__PORT__` (kept in
sync across the Dockerfile, `.env`, and `docker-compose.yml`). Everything else
— language, framework, build steps — is up to you.

## One-time secrets (per repo)

The deploy needs these repo secrets (the generator sets them for you if you ran
`new-project` with a secrets file):

- `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT` (optional), `VPS_PUBLIC_IP`
- `HOSTINGER_API_TOKEN`
