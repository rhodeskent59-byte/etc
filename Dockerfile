# OBD Home Systems platform — multi-stage OCI image.
# Builds the whole monorepo, then ships only the API runtime + the built
# portal shell (served same-origin by the API process, see static-web.ts).
# Runs identically under Docker and Podman.

# ---------- build stage ----------
FROM node:24-bookworm-slim AS build
WORKDIR /src
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci --no-audit --no-fund
# The shell must call the API same-origin: empty base = relative fetches.
ENV VITE_API_BASE=""
RUN npm run build

# ---------- production dependencies ----------
FROM node:24-bookworm-slim AS proddeps
WORKDIR /src
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/design-system/package.json packages/design-system/package.json
COPY packages/fault-engine/package.json packages/fault-engine/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force

# ---------- runtime ----------
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=8787 \
    OBD_HOST=0.0.0.0 \
    OBD_DATA_DIR=/data \
    WEB_DIST=/app/apps/web/dist
WORKDIR /app
COPY --from=proddeps /src/node_modules ./node_modules
COPY --from=build /src/package.json ./package.json
# The api's workspace imports are @obd/shared and (since Task 2)
# @obd/fault-engine; they resolve from the root node_modules symlinks, so
# the real package files must sit beside them. The fault engine ships as
# its single byte-identical .mjs file — no build output.
COPY --from=build /src/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /src/packages/shared/dist ./packages/shared/dist
COPY --from=build /src/packages/fault-engine/package.json ./packages/fault-engine/package.json
COPY --from=build /src/packages/fault-engine/fault-engine.mjs ./packages/fault-engine/fault-engine.mjs
COPY --from=build /src/apps/api/package.json ./apps/api/package.json
COPY --from=build /src/apps/api/dist ./apps/api/dist
COPY --from=build /src/apps/web/dist ./apps/web/dist
RUN mkdir -p /data && chown -R node:node /data /app
USER node
EXPOSE 8787
VOLUME ["/data"]
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/server.js"]
