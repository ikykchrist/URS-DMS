// =============================================================================
// URS-DMS — maintenance:storage-check (Sprint 8.3)
// Read-only consistency + storage statistics report via the Root maintenance
// API. Requires the server on :4000 and ROOT credentials in .env.
// Usage:  node scripts/maintenance-storage-check.js
// =============================================================================

const fs = require("fs");
const path = require("path");

const BASE = process.env.API_BASE || "http://localhost:4000/api/v1";
const ENV_PATH = process.env.ENV_PATH || path.join(__dirname, "..", ".env");

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
  const env = loadEnv(ENV_PATH);
  const email = env.BOOTSTRAP_ROOT_EMAIL;
  const password = env.BOOTSTRAP_ROOT_PASSWORD;
  if (!email || !password) {
    console.error("BOOTSTRAP_ROOT_EMAIL / BOOTSTRAP_ROOT_PASSWORD are required in .env");
    process.exit(1);
  }

  const login = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: email, password }),
  });
  const loginBody = await login.json();
  if (!login.ok || !loginBody.data?.accessToken) {
    console.error(`Login failed: ${loginBody.error?.message || login.status}`);
    process.exit(1);
  }
  const token = loginBody.data.accessToken;
  const headers = { authorization: `Bearer ${token}` };

  const checkRes = await fetch(`${BASE}/root/maintenance/check`, { headers });
  const checkBody = await checkRes.json();
  if (!checkRes.ok) {
    console.error(`Storage check failed: ${checkBody.error?.message || checkRes.status}`);
    process.exit(1);
  }
  console.log(JSON.stringify(checkBody.data, null, 2));
}

main().catch((err) => {
  console.error("Maintenance storage check failed:", err.message || err);
  process.exit(1);
});
