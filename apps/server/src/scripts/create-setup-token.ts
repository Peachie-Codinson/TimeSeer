import { config } from "../config.js";
import { sqlite } from "../db/connection.js";
import { ownerExists, createSetupToken } from "../modules/auth/service.js";

if (ownerExists()) {
  console.error("An owner already exists; the setup route is disabled.");
  process.exit(1);
}

const token = createSetupToken();
sqlite.close();

console.log("Setup URL (valid for one hour):");
console.log(`${config.publicOrigin}/setup?token=${token}`);
