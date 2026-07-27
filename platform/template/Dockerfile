# --- Replace this with your app's real build. ---
#
# This default is a tiny, dependency-free static/health server so a freshly
# generated project builds, deploys, and serves HTTPS out of the box. Swap it
# for your stack (Node, Python, Go, a static build, ...). The only contract the
# platform cares about: the container listens on the port declared as
# APP_PORT in docker-compose.yml (default 8080).
#
# Examples:
#   Node:    FROM node:22-alpine ... CMD ["node","dist/index.js"]
#   Python:  FROM python:3.12-slim ... CMD ["uvicorn","app:app","--host","0.0.0.0","--port","8080"]
#   Static:  build assets, then serve with caddy/nginx on 8080

FROM python:3.12-alpine

WORKDIR /app

# Copy everything except what .dockerignore excludes.
COPY . .

# The port the app listens on inside the container. Keep this in sync with
# APP_PORT in docker-compose.yml.
ENV APP_PORT=8080
EXPOSE 8080

# Default app: serve ./public (or a placeholder) over HTTP. Replace as needed.
RUN mkdir -p public && [ -f public/index.html ] || printf '%s\n' \
    '<!doctype html><meta charset="utf-8"><title>__NAME__</title>' \
    '<h1>__NAME__ is live 🎉</h1><p>Served over HTTPS by Traefik.</p>' \
    > public/index.html

CMD ["sh", "-c", "python -m http.server \"$APP_PORT\" --directory public"]
