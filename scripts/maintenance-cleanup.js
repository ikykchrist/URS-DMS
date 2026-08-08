// =============================================================================
// URS-DMS — maintenance:cleanup (Sprint 8.3)
// Safe manual maintenance driver via the Root API.
// Usage:
//   node scripts/maintenance-cleanup.js --dry-run            (preview only)
//   node scripts/maintenance-cleanup.js --recycle --confirm  (recycle cleanup)
//   node scripts/maintenance-cleanup.js --orphans --confirm  (orphan cleanup)
//   node scripts/maintenance-cleanup.js --scan               (orphan scan only)
// Dry runs delete nothing. Destructive cleanup REQUIRES --confirm.
// =============================================================================

const fs = require("fs");
const path = require("path");

const BASE = process.env.API_BASE || "http://localhost:4000/api/v1";
const ENV_PATH = process.env.ENV_PATH || path.join(__dirname, "..", ".env");

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const SCAN = args.includes("--scan");
const RECYCLE = args.includes("--recycle");
const ORPHANS = args.includes("--orphans");
const CONFIRM = args.includes("--confirm");

function loadEnv(file) {
  const out = {};
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

async function main() {
  if (!SCAN && !RECYCLE && !ORPHANS) {
    console.error("Usage: node scripts/maintenance-cleanup.js [--scan|--recycle|--orphans] [--dry-run] [--confirm]");
    process.exit(1);
  }
  if ((RECYCLE || ORPHANS) && !DRY && !CONFIRM) {
    console.error("Destructive cleanup requires --confirm (or use --dry-run first).");
    process.exit(1);
  }

  const env = loadEnv(ENV_PATH);
  const login = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: env.BOOTSTRAP_ROOT_EMAIL, password: env.BOOTSTRAP_ROOT_PASSWORD }),
  });
  const loginBody = await login.json();
  if (!login.ok || !loginBody.data?.accessToken) {
    console.error(`Login failed: ${loginBody.error?.message || login.status}`);
    process.exit(1);
  }
  const headers = {
    authorization: `Bearer ${loginBody.data.accessToken}`,
    "content-type": "application/json",
  };

  const endpoint = SCAN ? "scan" : RECYCLE ? "cleanup-recycle" : "cleanup-orphans";
  const res = await fetch(`${BASE}/root/maintenance/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ dryRun: DRY, confirm: CONFIRM }),
  });
  const body = await res.json();
  if (!res.ok) {
    console.error(`${endpoint} failed: ${body.error?.message || res.status}`);
    process.exit(1);
  }
  console.log(JSON.stringify(body.data, null, 2));
}

main().catch((err) => {
  console.error("Maintenance cleanup failed:", err.message || err);
  process.exit(1);
});
