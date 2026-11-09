/*
 * Keeps the local URS-DMS API available when its Node child terminates.
 *
 * The application process still exits on an uncaught exception rather than
 * continuing in an unknown state. This supervisor is the recovery boundary:
 * it preserves the child's stdout/stderr and starts a clean replacement with
 * bounded exponential backoff.
 */
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const workspaceDir = path.resolve(__dirname, "..");
const serverDir = path.join(workspaceDir, "server");
// The project uses TypeScript path aliases (`@/...`) at runtime. Launch the
// supported tsx entry so aliases resolve correctly; the current dist output
// retains those aliases and cannot be started by plain Node.
const tsxEntry = path.join(workspaceDir, "node_modules", "tsx", "dist", "cli.mjs");
const stdoutPath = path.join(workspaceDir, "urs-server.log");
const stderrPath = path.join(workspaceDir, "urs-server.err.log");
const supervisorPath = path.join(workspaceDir, "urs-server-supervisor.log");

let stopping = false;
let child = null;
let restartCount = 0;

function record(message) {
  const line = `${new Date().toISOString()} ${message}\n`;
  fs.appendFileSync(supervisorPath, line, "utf8");
}

function start() {
  if (stopping) return;

  const stdout = fs.openSync(stdoutPath, "a");
  const stderr = fs.openSync(stderrPath, "a");
  child = spawn(process.execPath, [tsxEntry, "src/server.ts"], {
    cwd: serverDir,
    env: process.env,
    stdio: ["ignore", stdout, stderr],
    windowsHide: true,
  });
  record(`[api-supervisor] started API child pid=${child.pid}`);

  child.once("error", (error) => {
    record(`[api-supervisor] API child spawn error: ${error.stack || error.message}`);
  });

  child.once("exit", (code, signal) => {
    fs.closeSync(stdout);
    fs.closeSync(stderr);
    child = null;
    if (stopping) {
      record(`[api-supervisor] API child stopped code=${code} signal=${signal ?? "none"}`);
      return;
    }

    restartCount += 1;
    const delayMs = Math.min(10_000, 1_000 * 2 ** Math.min(restartCount - 1, 3));
    record(`[api-supervisor] API child exited code=${code} signal=${signal ?? "none"}; restarting in ${delayMs}ms`);
    // Keep the supervisor alive through the restart delay. Unreferencing this
    // timer lets Node exit as soon as the failed child closes, defeating the
    // recovery guarantee.
    setTimeout(start, delayMs);
  });
}

function stop(signal) {
  if (stopping) return;
  stopping = true;
  record(`[api-supervisor] received ${signal}; stopping`);
  if (child && !child.killed) child.kill("SIGTERM");
  else process.exit(0);
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
process.on("uncaughtException", (error) => {
  record(`[api-supervisor] fatal supervisor exception: ${error.stack || error.message}`);
  stop("uncaughtException");
});

start();
