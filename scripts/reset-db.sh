#!/usr/bin/env bash
# =============================================================
# reset-db.sh — Drop and recreate the database.
#
# ⚠️  DESTRUCTIVE: This script DELETES all data in the URS-DMS
# database. Use only in development.
#
# Usage:
#   ./scripts/reset-db.sh            # drop volumes + re-create
#   ./scripts/reset-db.sh --keep     # drop only the schema, keep volumes
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

MODE="${1:-full}"
case "$MODE" in
  --keep)
    echo "[reset-db] dropping schema, keeping volumes..."
    docker compose exec -T postgres \
      psql -U "${POSTGRES_USER:-urs_user}" -d "${POSTGRES_DB:-urs_dms}" \
      -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    echo "[reset-db] schema reset. Re-running migrations..."
    docker compose exec -T server npx prisma migrate deploy
    ;;
  *)
    echo "[reset-db] ⚠️  This will DELETE ALL DATA in postgres + minio."
    read -p "Continue? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "[reset-db] cancelled"
      exit 1
    fi
    echo "[reset-db] stopping services + removing volumes..."
    docker compose down -v
    echo "[reset-db] restarting..."
    docker compose up -d postgres minio
    echo "[reset-db] waiting for health..."
    sleep 10
    echo "[reset-db] starting server (will auto-create bucket + apply migrations)..."
    docker compose up -d server
    echo "[reset-db] ✅ done"
    ;;
esac
