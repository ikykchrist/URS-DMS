// =============================================================================
// URS-DMS — maintenance:run (Sprint 8.3)
// Smallest reliable scheduled maintenance runner: performs a recycle-bin
// retention cleanup + orphan scan on boot and then every 24 hours. Runs
// against the Root maintenance API; the database-backed lock prevents two
// runners (or two server instances) from running the same destructive job
// concurrently, so this script may be run from Task Scheduler / cron on a
// single host safely.
// Usage:  node scripts/maintenance-runner.js [--once]
// =============================================================================

const fs = require("fs");
const path = require("path");

const BASE = process.env.API_BASE || "http://localhost:4000/api/v1";
const ENV_PATH = process.env.ENV_PATH || path.join(__dirname, "..", ".env");
const INTERVAL_MS = 24 * 60 * 60 * 1000;
const ONCE = process.argv.includes("--once");

function loadEnv(file) {
  const out = {};
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

async function post(token, endpoint, body) {
  const res = await fetch(`${BASE}/root/maintenance/${endpoint}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`${endpoint} failed: ${json.error?.message || res.status}`);
  }
  return json.data;
}

async function runCycle(env) {
  const login = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: env.BOOTSTRAP_ROOT_EMAIL, password: env.BOOTSTRAP_ROOT_PASSWORD }),
  });
  const loginBody = await login.json();
  if (!login.ok || !loginBody.data?.accessToken) {
    throw new Error(`login failed: ${loginBody.error?.message || login.status}`);
  }
  const token = loginBody.data.accessToken;
  const stamp = new Date().toISOString();
  console.log(`[maintenance] ${stamp} cycle start`);

  // 1. Recycle Bin retention cleanup (30-day policy, idempotent).
  const recycle = await post(token, "cleanup-recycle", { dryRun: false, confirm: true });
  console.log(`[maintenance] recycle cleanup: ${JSON.stringify(recycle)}`);

  // 2. Orphan scan (detection only; cleanup happens after the 7-day grace).
  const scan = await post(token, "scan", { dryRun: false });
  console.log(`[maintenance] orphan scan: ${JSON.stringify(scan)}`);

  console.log(`[maintenance] cycle complete`);
}

async function main() {
  const env = loadEnv(ENV_PATH);
  if (!env.BOOTSTRAP_ROOT_EMAIL || !env.BOOTSTRAP_ROOT_PASSWORD) {
    console.error("BOOTSTRAP_ROOT_* are required in .env");
    process.exit(1);
  }
  console.log(`[maintenance] runner starting (interval ${INTERVAL_MS / 3600000}h)`);
  await runCycle(env).catch((err) => console.error(`[maintenance] cycle failed: ${err.message}`));
  if (ONCE) {
    console.log("[maintenance] --once: exiting after one cycle");
    process.exit(0);
  }
  setInterval(() => {
    runCycle(env).catch((err) => console.error(`[maintenance] cycle failed: ${err.message}`));
  }, INTERVAL_MS);
}

main().catch((err) => {
  console.error("[maintenance] runner failed:", err.message || err);
  process.exit(1);
});
