# =============================================================================
# URS-DMS — Frontend (production) Dockerfile
#
# Multi-stage build:
#   1. deps    — install client dependencies
#   2. build   — compile TypeScript + Vite production build
#   3. runtime — Nginx Alpine serving dist/ with SPA fallback + /api reverse-proxy
#
# The backend lives in server/Dockerfile; this image is a pure static SPA that
# forwards /api/* to the backend service. Same-domain routing avoids CORS and
# keeps cookies simple.
#
# Build context: repo root (so it can copy ./client and ./deploy/nginx.conf).
# Build arg:
#   VITE_API_BASE  — defaults to "/api/v1" (same-origin). Override only if the
#                    backend lives on a different domain.
# =============================================================================

# ---- 1. deps ---------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY client/package.json client/package-lock.json* ./
RUN npm ci --legacy-peer-deps

# ---- 2. build --------------------------------------------------------------
FROM deps AS build
WORKDIR /app

ARG VITE_API_BASE=/api/v1
ENV VITE_API_BASE=${VITE_API_BASE}

COPY client ./
RUN npm run build

# ---- 3. runtime ------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache gettext

# Replace default config with our SPA + reverse-proxy template. The upstream
# hostname is substituted at container start from BACKEND_UPSTREAM (Dokploy
# assigns randomized container names, so it cannot be baked at build time).
RUN rm /etc/nginx/conf.d/default.conf \
    && chown nginx:nginx /etc/nginx/conf.d
COPY deploy/nginx/nginx.conf /etc/nginx/conf.d/app.conf.template
COPY deploy/nginx/entrypoint.sh /usr/local/bin/nginx-entrypoint.sh
RUN chmod +x /usr/local/bin/nginx-entrypoint.sh

# Static assets
COPY --from=build /app/dist /usr/share/nginx/html

# Run as non-root for safer container defaults
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/usr/local/bin/nginx-entrypoint.sh"]
