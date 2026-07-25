import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import Database from "better-sqlite3";
import { config } from "../config.js";

// Never copy a live SQLite file with a plain filesystem copy — WAL mode means the on-disk
// .db file alone isn't a consistent snapshot. better-sqlite3's backup() drives SQLite's
// Online Backup API instead, which is safe to run against a database the server still has
// open (spec 18.4).
const backupDir = process.env.BACKUP_DIR ?? join(dirname(config.databasePath), "backups");
const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

mkdirSync(backupDir, { recursive: true });

const dbBackupPath = join(backupDir, `planner-${stamp}.db`);
const source = new Database(config.databasePath, { readonly: true, fileMustExist: true });
await source.backup(dbBackupPath);
source.close();
console.log(`Database backed up to ${dbBackupPath}`);

if (existsSync(config.attachmentsDir)) {
  const attachmentsArchive = join(backupDir, `attachments-${stamp}.tar.gz`);
  execFileSync("tar", [
    "-czf",
    attachmentsArchive,
    "-C",
    dirname(config.attachmentsDir),
    basename(config.attachmentsDir),
  ]);
  console.log(`Attachments archived to ${attachmentsArchive}`);
} else {
  console.log("No attachments directory found; skipping attachments archive.");
}
