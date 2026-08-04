#!/bin/sh
# =============================================================================
# URS-DMS — container entrypoint
# Runs migrations + seed on every boot (idempotent), then execs the CMD.
# =============================================================================
set -e

echo "[entrypoint] applying Prisma migrations..."
npx prisma migrate deploy

echo "[entrypoint] running seed..."
npx tsx prisma/seed.ts

echo "[entrypoint] starting application: $@"
exec "$@"
