#!/bin/sh
# =============================================================================
# URS-DMS - frontend container entrypoint.
# Renders the nginx config template with the backend upstream hostname, then
# starts nginx. The backend container name is randomized by the platform
# (Dokploy), so it is injected at container start via BACKEND_UPSTREAM.
# =============================================================================

set -e

: "${BACKEND_UPSTREAM:=urs-server:4000}"
export BACKEND_UPSTREAM

envsubst '${BACKEND_UPSTREAM}' \
    < /etc/nginx/conf.d/app.conf.template \
    > /etc/nginx/conf.d/app.conf

exec nginx -g 'daemon off;'
