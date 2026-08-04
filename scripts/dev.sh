#!/usr/bin/env bash
# =============================================================
# dev.sh — Start the full URS-DMS stack for local development.
#
# Behavior:
#   - Starts postgres + minio + pgadmin via docker compose
#   - Runs the server on the host (hot reload via tsx watch)
#   - Runs the client on the host (hot reload via Vite)
#   - Tails logs from each process
#
# Usage:
#   ./scripts/dev.sh                 # start everything
#   ./scripts/dev.sh --no-client     # skip the client
#   ./scripts/dev.sh --no-server     # skip the server
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

START_CLIENT=1
START_SERVER=1
START_INFRA=1

for arg in "$@"; do
  case "$arg" in
    --no-client) START_CLIENT=0 ;;
    --no-server) START_SERVER=0 ;;
    --no-infra)  START_INFRA=0 ;;
    --help|-h)
      echo "Usage: $0 [--no-client] [--no-server] [--no-infra]"
      exit 0
      ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

cd "${ROOT_DIR}"

# ── 1. Ensure .env exists ──────────────────────────────────
if [ ! -f ".env" ]; then
  echo "[dev] .env not found — copying from .env.example"
  cp .env.example .env
  echo "[dev] ⚠️  Edit .env and replace JWT_ACCESS_SECRET / JWT_REFRESH_SECRET"
fi

# ── 2. Install workspace dependencies (once) ────────────────
if [ ! -d "node_modules" ]; then
  echo "[dev] installing workspace dependencies (one-time)..."
  npm install
fi

# ── 3. Start infra via docker compose ─────────────────────
if [ "${START_INFRA}" -eq 1 ]; then
  echo "[dev] starting postgres + minio + pgadmin..."
  docker compose up -d postgres minio pgadmin
  echo "[dev] waiting for postgres to be healthy..."
  for i in {1..30}; do
    if docker compose ps postgres | grep -q "(healthy)"; then
      echo "[dev] postgres is healthy"
      break
    fi
    sleep 1
  done
  echo "[dev] waiting for minio to be healthy..."
  for i in {1..30}; do
    if docker compose ps minio | grep -q "(healthy)"; then
      echo "[dev] minio is healthy"
      break
    fi
    sleep 1
  done
fi

# ── 4. Generate Prisma client ──────────────────────────────
echo "[dev] generating Prisma client..."
npm --workspace server run prisma:generate

# ── 5. Start server (host) ────────────────────────────────
if [ "${START_SERVER}" -eq 1 ]; then
  echo "[dev] starting server on http://localhost:4000..."
  npm run dev:server &
  SERVER_PID=$!
  trap "kill ${SERVER_PID} 2>/dev/null || true" EXIT
fi

# ── 6. Start client (host) ─────────────────────────────────
if [ "${START_CLIENT}" -eq 1 ]; then
  echo "[dev] starting client on http://localhost:5173..."
  npm run dev:client &
  CLIENT_PID=$!
  trap "kill ${SERVER_PID} ${CLIENT_PID} 2>/dev/null || true" EXIT
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  URS-DMS dev stack is up:"
echo "  • Server:  http://localhost:4000/api/v1/health"
echo "  • Client:  http://localhost:5173"
echo "  • MinIO:   http://localhost:9001"
echo "  • pgAdmin: http://localhost:5050"
echo ""
echo "  Press Ctrl+C to stop."
echo "═══════════════════════════════════════════════════════════════"

wait
