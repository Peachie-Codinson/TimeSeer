import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { tasks, workSessions } from "../../db/schema.js";

export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class LockedError extends Error {}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type WorkSessionStatus = "planned" | "in_progress" | "completed" | "partial" | "skipped" | "cancelled";

export interface WorkSessionInput {
  taskId: string;
  startsAt: number;
  endsAt: number;
}

/**
 * Creates a planned work session for a task. This is the minimal slice needed for
 * task-to-calendar drag (Stage 4); the full lifecycle (start/complete/partial/skip/lock)
 * lands in Stage 5.
 */
export function createWorkSession(input: WorkSessionInput) {
  const task = db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, input.taskId)).get();
  if (!task) throw new NotFoundError();

  const now = Date.now();
  return db
    .insert(workSessions)
    .values({
      taskId: input.taskId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      plannedMinutes: Math.round((input.endsAt - input.startsAt) / 60_000),
      status: "planned",
      automaticallyAdded: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
}

/** Tasks with a currently in-progress work session, for the dashboard's "Now" section. */
export function listTasksWithActiveSession() {
  return db
    .select({ task: tasks })
    .from(workSessions)
    .innerJoin(tasks, eq(workSessions.taskId, tasks.id))
    .where(eq(workSessions.status, "in_progress"))
    .all()
    .map((row) => row.task);
}

export function listWorkSessionsInRange(rangeStart: number, rangeEnd: number) {
  return db
    .select()
    .from(workSessions)
    .where(and(lt(workSessions.startsAt, rangeEnd), gt(workSessions.endsAt, rangeStart)))
    .all();
}

export function getWorkSession(id: string) {
  return db.select().from(workSessions).where(eq(workSessions.id, id)).get();
}

export interface WorkSessionUpdateInput {
  startsAt?: number;
  endsAt?: number;
  notes?: string;
}

export function updateWorkSession(id: string, input: WorkSessionUpdateInput, expectedVersion: number) {
  return db.transaction((tx) => {
    const current = tx.select().from(workSessions).where(eq(workSessions.id, id)).get();
    if (!current) throw new NotFoundError();
    if (current.version !== expectedVersion) throw new ConflictError();
    if (current.locked) throw new LockedError();

    const plannedMinutes =
      input.startsAt !== undefined && input.endsAt !== undefined
        ? Math.round((input.endsAt - input.startsAt) / 60_000)
        : undefined;

    return tx
      .update(workSessions)
      .set({ ...input, plannedMinutes, version: current.version + 1, updatedAt: Date.now() })
      .where(eq(workSessions.id, id))
      .returning()
      .get();
  }, { behavior: "immediate" });
}

export function deleteWorkSession(id: string) {
  return db.transaction((tx) => {
    const current = tx.select().from(workSessions).where(eq(workSessions.id, id)).get();
    if (!current) throw new NotFoundError();
    if (current.locked) throw new LockedError();
    tx.delete(workSessions).where(eq(workSessions.id, id)).run();
  }, { behavior: "immediate" });
}

function applyCompletionToTask(tx: Tx, taskId: string, minutesSpent: number) {
  const task = tx.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return;

  const remainingMinutes = task.remainingMinutes !== null ? Math.max(0, task.remainingMinutes - minutesSpent) : null;
  let progressPercent = task.progressPercent;
  if (task.estimatedMinutes) {
    const spent = task.estimatedMinutes - (remainingMinutes ?? 0);
    progressPercent = Math.min(100, Math.max(0, Math.round((spent / task.estimatedMinutes) * 100)));
  }

  tx.update(tasks)
    .set({ remainingMinutes, progressPercent, updatedAt: Date.now() })
    .where(eq(tasks.id, taskId))
    .run();
}

function transitionSession(id: string, expectedVersion: number, status: WorkSessionStatus) {
  return db.transaction((tx) => {
    const current = tx.select().from(workSessions).where(eq(workSessions.id, id)).get();
    if (!current) throw new NotFoundError();
    if (current.version !== expectedVersion) throw new ConflictError();

    return tx
      .update(workSessions)
      .set({ status, version: current.version + 1, updatedAt: Date.now() })
      .where(eq(workSessions.id, id))
      .returning()
      .get();
  }, { behavior: "immediate" });
}

export function startSession(id: string, expectedVersion: number) {
  return transitionSession(id, expectedVersion, "in_progress");
}

export function skipSession(id: string, expectedVersion: number) {
  return transitionSession(id, expectedVersion, "skipped");
}

function finishSession(id: string, expectedVersion: number, status: "completed" | "partial", actualMinutes?: number) {
  return db.transaction((tx) => {
    const current = tx.select().from(workSessions).where(eq(workSessions.id, id)).get();
    if (!current) throw new NotFoundError();
    if (current.version !== expectedVersion) throw new ConflictError();

    const minutes = actualMinutes ?? current.plannedMinutes;
    const session = tx
      .update(workSessions)
      .set({ status, actualMinutes: minutes, version: current.version + 1, updatedAt: Date.now() })
      .where(eq(workSessions.id, id))
      .returning()
      .get();

    applyCompletionToTask(tx, current.taskId, minutes);
    return session;
  }, { behavior: "immediate" });
}

export function completeSession(id: string, expectedVersion: number, actualMinutes?: number) {
  return finishSession(id, expectedVersion, "completed", actualMinutes);
}

export function partialSession(id: string, expectedVersion: number, actualMinutes: number) {
  return finishSession(id, expectedVersion, "partial", actualMinutes);
}

export function setSessionLocked(id: string, expectedVersion: number, locked: boolean) {
  return db.transaction((tx) => {
    const current = tx.select().from(workSessions).where(eq(workSessions.id, id)).get();
    if (!current) throw new NotFoundError();
    if (current.version !== expectedVersion) throw new ConflictError();

    return tx
      .update(workSessions)
      .set({ locked: locked ? 1 : 0, version: current.version + 1, updatedAt: Date.now() })
      .where(eq(workSessions.id, id))
      .returning()
      .get();
  }, { behavior: "immediate" });
}

/**
 * Called from the task-resolve transaction (spec 13.5): completes any in-progress session for
 * the task and cancels planned sessions still in the future. Must run inside the caller's `tx`.
 */
export function closeSessionsForResolvedTask(tx: Tx, taskId: string, now: number) {
  const inProgress = tx
    .select()
    .from(workSessions)
    .where(and(eq(workSessions.taskId, taskId), eq(workSessions.status, "in_progress")))
    .all();

  for (const session of inProgress) {
    tx.update(workSessions)
      .set({ status: "completed", actualMinutes: session.actualMinutes ?? session.plannedMinutes, updatedAt: now })
      .where(eq(workSessions.id, session.id))
      .run();
  }

  tx.update(workSessions)
    .set({ status: "cancelled", updatedAt: now })
    .where(and(eq(workSessions.taskId, taskId), eq(workSessions.status, "planned"), gt(workSessions.startsAt, now)))
    .run();
}
