# Vestaboard Studio — server + built web app in one image.
# Build from the vestaboard/ directory:  docker build -t vestaboard-studio .

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Workspace manifests + built output only; server deps installed fresh.
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/packages/core/package.json packages/core/package.json
COPY --from=build /app/packages/core/dist packages/core/dist
COPY --from=build /app/packages/data/package.json packages/data/package.json
COPY --from=build /app/packages/data/dist packages/data/dist
COPY --from=build /app/apps/server/package.json apps/server/package.json
COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/web/dist apps/web/dist
RUN npm ci --omit=dev -w @vestaboard/server && npm cache clean --force

# SQLite lives on a volume so the DB survives image upgrades.
ENV DB_PATH=/data/vestaboard.db
ENV PORT=8787
RUN mkdir /data && chown node:node /data
VOLUME /data
USER node
EXPOSE 8787

CMD ["node", "apps/server/dist/index.js"]
