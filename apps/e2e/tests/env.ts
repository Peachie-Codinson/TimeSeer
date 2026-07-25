import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Kept in sync with the defaults in ../scripts/run-server.mjs (which cannot import this
// file directly since it runs as a plain Node script, not through Playwright's TS loader).
export const E2E_PORT = process.env.E2E_PORT ?? "3900";
export const BASE_URL = `http://localhost:${E2E_PORT}`;
export const DATA_DIR = path.resolve(__dirname, "..", ".e2e-data");
export const DATABASE_PATH = path.join(DATA_DIR, "planner.db");
export const ATTACHMENTS_DIR = path.join(DATA_DIR, "attachments");
export const SERVER_DIR = path.resolve(__dirname, "../../../apps/server");
export const STORAGE_STATE_PATH = path.resolve(__dirname, ".auth/state.json");
