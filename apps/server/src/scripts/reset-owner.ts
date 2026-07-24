import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { sqlite } from "../db/connection.js";
import { getOwner, hashPassword, invalidateAllSessions, updateOwnerPassword } from "../modules/auth/service.js";

const owner = getOwner();
if (!owner) {
  console.error("No owner exists yet; run the setup flow first.");
  process.exit(1);
}

const rl = createInterface({ input: stdin, output: stdout });
const newPassword = await rl.question(`New password for ${owner.email}: `);
rl.close();

if (newPassword.length < 12) {
  console.error("Password must be at least 12 characters.");
  process.exit(1);
}

updateOwnerPassword(owner.id, await hashPassword(newPassword));
invalidateAllSessions();
sqlite.close();

console.log("Password reset. All existing sessions have been revoked.");
