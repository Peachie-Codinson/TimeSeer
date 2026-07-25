import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { ATTACHMENTS_DIR, BASE_URL, DATABASE_PATH, SERVER_DIR, STORAGE_STATE_PATH } from "./env";
import { OWNER_EMAIL, OWNER_PASSWORD } from "./credentials";

export default async function globalSetup() {
  mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });

  console.log("[e2e:setup] Minting an owner setup token...");
  const output = execFileSync("node", ["dist/scripts/create-setup-token.js"], {
    cwd: SERVER_DIR,
    env: { ...process.env, DATABASE_PATH, ATTACHMENTS_DIR, PUBLIC_ORIGIN: BASE_URL, NODE_ENV: "test" },
    encoding: "utf-8",
  });
  const match = output.match(/token=([^\s]+)/);
  if (!match) throw new Error(`Could not find a setup token in create-setup-token output:\n${output}`);
  const token = match[1];

  console.log("[e2e:setup] Completing owner setup through the real UI...");
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  await page.goto(`/setup?token=${token}`);
  await page.getByLabel("Email").fill(OWNER_EMAIL);
  await page.getByLabel("Password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(BASE_URL + "/");
  await page.getByRole("heading", { name: "Planner" }).waitFor();

  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();

  console.log("[e2e:setup] Owner account created and session saved.");
}
