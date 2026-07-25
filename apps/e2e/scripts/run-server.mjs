#!/usr/bin/env node
// Spawned by Playwright's `webServer` config (see ../playwright.config.ts). Builds the
// workspace packages the server needs, resets a throwaway SQLite database under
// apps/e2e/.e2e-data, migrates it, and starts the real production server binary
// (dist/index.js) against it — the e2e suite exercises the same build artifact that ships.
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const serverDir = path.join(repoRoot, "apps/server");
const dataDir = path.resolve(__dirname, "..", ".e2e-data");

const PORT = process.env.E2E_PORT ?? "3900";
const PUBLIC_ORIGIN = `http://localhost:${PORT}`;
const DATABASE_PATH = path.join(dataDir, "planner.db");
const ATTACHMENTS_DIR = path.join(dataDir, "attachments");

function run(cmd, args, cwd, env = process.env) {
  execFileSync(cmd, args, { cwd, env, stdio: "inherit" });
}

console.log("[e2e] Building workspace packages...");
run("pnpm", ["--filter", "@planner/scheduler", "build"], repoRoot);
run("pnpm", ["--filter", "@planner/server", "build"], repoRoot);
run("pnpm", ["--filter", "@planner/web", "build"], repoRoot);

console.log("[e2e] Resetting test database...");
rmSync(dataDir, { recursive: true, force: true });
mkdirSync(dataDir, { recursive: true });

const env = {
  ...process.env,
  NODE_ENV: "test",
  PORT,
  PUBLIC_ORIGIN,
  DATABASE_PATH,
  ATTACHMENTS_DIR,
};

console.log("[e2e] Running database migrations...");
run("node", ["dist/db/migrate.js"], serverDir, env);

console.log(`[e2e] Starting server on ${PUBLIC_ORIGIN}...`);
const server = spawn("node", ["dist/index.js"], { cwd: serverDir, env, stdio: "inherit" });

const shutdown = () => {
  server.kill();
  process.exit();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
server.on("exit", (code) => process.exit(code ?? 0));
