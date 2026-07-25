import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "../config.js";

// Usage: pnpm restore <path-to-backup.db> [path-to-attachments.tar.gz]
//
// Run this with the server stopped. It overwrites the live database file, so any
// stale -wal/-shm sidecars next to it must be removed first — otherwise SQLite would
// try to replay a WAL that doesn't match the restored file on next open (spec 18.4).
const [dbBackupPath, attachmentsArchive] = process.argv.slice(2);

if (!dbBackupPath) {
  console.error("Usage: pnpm restore <path-to-backup.db> [path-to-attachments.tar.gz]");
  process.exit(1);
}

if (!existsSync(dbBackupPath)) {
  console.error(`Backup file not found: ${dbBackupPath}`);
  process.exit(1);
}

mkdirSync(dirname(config.databasePath), { recursive: true });

for (const suffix of ["-wal", "-shm"]) {
  const sidecar = `${config.databasePath}${suffix}`;
  if (existsSync(sidecar)) rmSync(sidecar);
}

copyFileSync(dbBackupPath, config.databasePath);
console.log(`Database restored from ${dbBackupPath} to ${config.databasePath}`);

if (attachmentsArchive) {
  if (!existsSync(attachmentsArchive)) {
    console.error(`Attachments archive not found: ${attachmentsArchive}`);
    process.exit(1);
  }
  rmSync(config.attachmentsDir, { recursive: true, force: true });
  mkdirSync(dirname(config.attachmentsDir), { recursive: true });
  execFileSync("tar", ["-xzf", attachmentsArchive, "-C", dirname(config.attachmentsDir)]);
  console.log(`Attachments restored from ${attachmentsArchive} to ${config.attachmentsDir}`);
}
