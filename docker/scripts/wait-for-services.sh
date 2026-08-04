#!/bin/sh
# =============================================================
# wait-for-services.sh
#
# Waits for postgres and MinIO to be ready before proceeding.
# Used by the server container's CMD chain to avoid race conditions
# during the first boot after `docker compose up`.
#
# Usage:
#   ./wait-for-services.sh <postgres-host> <minio-host>
# =============================================================

set -e

POSTGRES_HOST="${1:-urs-postgres}"
MINIO_HOST="${2:-urs-minio}"

echo "[wait] waiting for postgres at ${POSTGRES_HOST}:5432..."
# Use bash loop because alpine ships ash which lacks certain test commands
until (echo > /dev/tcp/${POSTGRES_HOST}/5432) 2>/dev/null; do
  echo "[wait] postgres not ready, retrying in 2s..."
  sleep 2
done
echo "[wait] postgres is ready"

echo "[wait] waiting for minio at ${MINIO_HOST}:9000..."
until (echo > /dev/tcp/${MINIO_HOST}/9000) 2>/dev/null; do
  echo "[wait] minio not ready, retrying in 2s..."
  sleep 2
done
echo "[wait] minio is ready"

echo "[wait] all services are up — proceeding"
