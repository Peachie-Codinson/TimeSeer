import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { archiveBatches, taskResolutions, tasks, workSessions } from "../../db/schema.js";

export class NotFoundError extends Error {}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// "Weekly" flush per spec 13.7: a resolved task becomes eligible once it's been resolved
// for at least this long. The persistent scheduled-job runner that fires this automatically
// on a cron is Stage 6 infrastructure; this module implements the eligibility rule and the
// transactional flush itself, triggered manually via "Immolate" for now.
const ARCHIVE_ELIGIBILITY_MS = 7 * 24 * 60 * 60 * 1000;

function eligibleTasks(tx: Tx | typeof db) {
  const cutoff = Date.now() - ARCHIVE_ELIGIBILITY_MS;
  return tx
    .select()
    .from(tasks)
    .where(and(eq(tasks.state, "resolved"), eq(tasks.archiveProtected, 0), lt(tasks.resolvedAt, cutoff)))
    .all();
}

export function previewFlush() {
  const eligible = eligibleTasks(db);
  return { eligibleCount: eligible.length, taskIds: eligible.map((t) => t.id) };
}

/**
 * "Immolate all" (taskIds omitted) archives every age-eligible resolved task. "Immolate
 * selected" (taskIds given) archives exactly those tasks instead, as long as each is
 * currently resolved and not archive-protected — bypassing the weekly-eligibility age check
 * since the user explicitly chose them (spec 8.2).
 */
export function flushArchive(taskIds?: string[]) {
  return db.transaction((tx) => {
    const targets = taskIds
      ? taskIds
          .map((id) => tx.select().from(tasks).where(eq(tasks.id, id)).get())
          .filter((t): t is NonNullable<typeof t> => !!t && t.state === "resolved" && t.archiveProtected === 0)
      : eligibleTasks(tx);

    if (targets.length === 0) return { batchId: null, archivedCount: 0 };

    const now = Date.now();
    const batch = tx.insert(archiveBatches).values({ createdAt: now, taskCount: targets.length }).returning().get();

    for (const task of targets) {
      tx.update(tasks)
        .set({ state: "archived", archivedAt: now, archiveBatchId: batch.id, updatedAt: now })
        .where(eq(tasks.id, task.id))
        .run();
    }

    return { batchId: batch.id, archivedCount: targets.length };
  }, { behavior: "immediate" });
}

export function listArchivedTasks() {
  return db.select().from(tasks).where(eq(tasks.state, "archived")).orderBy(desc(tasks.archivedAt)).all();
}

export function restoreTask(taskId: string) {
  return db.transaction((tx) => {
    const task = tx.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!task || task.state !== "archived") throw new NotFoundError();

    return tx
      .update(tasks)
      .set({ state: "resolved", archivedAt: null, archiveBatchId: null, version: task.version + 1, updatedAt: Date.now() })
      .where(eq(tasks.id, taskId))
      .returning()
      .get();
  }, { behavior: "immediate" });
}

export function permanentlyDeleteTask(taskId: string) {
  return db.transaction((tx) => {
    const task = tx.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!task || task.state !== "archived") throw new NotFoundError();

    tx.delete(workSessions).where(eq(workSessions.taskId, taskId)).run();
    tx.delete(taskResolutions).where(eq(taskResolutions.taskId, taskId)).run();
    tx.delete(tasks).where(eq(tasks.id, taskId)).run();
  }, { behavior: "immediate" });
}
