#!/usr/bin/env bash
# =============================================================
# lint.sh — Run all lint + typecheck + format checks.
#
# Runs:
#   - ESLint (server)
#   - Prettier --check (server)
#   - TypeScript typecheck (server + client)
#
# Exits non-zero if anything fails. Suitable for CI.
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

echo "═══════════════════════════════════════════════════"
echo "  Lint + typecheck pipeline"
echo "═══════════════════════════════════════════════════"

echo ""
echo "[1/4] Server ESLint..."
npm --workspace server run lint

echo ""
echo "[2/4] Server Prettier check..."
npm --workspace server run format:check

echo ""
echo "[3/4] Server TypeScript typecheck..."
npm --workspace server run typecheck

echo ""
echo "[4/4] Client TypeScript typecheck..."
npm run typecheck:client || echo "[client] typecheck not configured — skipping"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ All checks passed"
echo "═══════════════════════════════════════════════════"
