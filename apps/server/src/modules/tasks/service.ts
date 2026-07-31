import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { activityLog, taskResolutions, tasks } from "../../db/schema.js";
import { closeSessionsForResolvedTask } from "../work-sessions/service.js";

export class ConflictError extends Error {}
export class NotFoundError extends Error {}

const POSITION_GAP = 1024;

export type TaskState = "active" | "in_progress" | "resolved" | "archived";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function logActivity(tx: Tx, entityId: string, action: string, detail?: Record<string, unknown>) {
  tx.insert(activityLog)
    .values({
      entityType: "task",
      entityId,
      action,
      detailJson: detail ? JSON.stringify(detail) : undefined,
      createdAt: Date.now(),
    })
    .run();
}

function nextIssueNumber(tx: Tx): number {
  const row = tx.select({ max: sql<number | null>`MAX(${tasks.issueNumber})` }).from(tasks).get();
  return (row?.max ?? 0) + 1;
}

function renumberColumn(tx: Tx, state: TaskState) {
  const rows = tx.select().from(tasks).where(eq(tasks.state, state)).orderBy(asc(tasks.position)).all();
  rows.forEach((row, i) => {
    tx.update(tasks)
      .set({ position: (i + 1) * POSITION_GAP })
      .where(eq(tasks.id, row.id))
      .run();
  });
}

/**
 * Computes a position for a drop between `previousTaskId` and `nextTaskId` (either may be
 * omitted for "at the start/end of the column"). Both ids must already belong to `state` and
 * must not be the task being moved. Renumbers the column when there's no integer gap left.
 */
function computePosition(tx: Tx, state: TaskState, previousTaskId?: string, nextTaskId?: string): number {
  const previous = previousTaskId ? tx.select().from(tasks).where(eq(tasks.id, previousTaskId)).get() : undefined;
  const next = nextTaskId ? tx.select().from(tasks).where(eq(tasks.id, nextTaskId)).get() : undefined;

  if (!previous && !next) {
    const last = tx.select().from(tasks).where(eq(tasks.state, state)).orderBy(desc(tasks.position)).limit(1).get();
    return (last?.position ?? 0) + POSITION_GAP;
  }

  if (!previous && next) {
    if (next.position > 1) return Math.floor(next.position / 2);
    renumberColumn(tx, state);
    const refreshed = tx.select().from(tasks).where(eq(tasks.id, next.id)).get()!;
    return Math.floor(refreshed.position / 2);
  }

  if (previous && !next) {
    return previous.position + POSITION_GAP;
  }

  const gap = next!.position - previous!.position;
  if (gap > 1) return Math.floor((previous!.position + next!.position) / 2);

  renumberColumn(tx, state);
  const refreshedPrev = tx.select().from(tasks).where(eq(tasks.id, previous!.id)).get()!;
  const refreshedNext = tx.select().from(tasks).where(eq(tasks.id, next!.id)).get()!;
  return Math.floor((refreshedPrev.position + refreshedNext.position) / 2);
}

export interface TaskInput {
  title: string;
  description?: string;
  areaId?: string;
  priority?: number;
  earliestStart?: number;
  preferredStart?: number;
  preferredEnd?: number;
  softDeadline?: number;
  hardDeadline?: number;
  estimatedMinutes?: number;
  remainingMinutes?: number;
  sessionMinutes?: number;
  isSplittable?: boolean;
  schedulingMode?: "manual" | "suggested" | "automatic";
}

export function createTask(input: TaskInput) {
  return db.transaction((tx) => {
    const now = Date.now();
    const issueNumber = nextIssueNumber(tx);
    const position = computePosition(tx, "active");

    const task = tx
      .insert(tasks)
      .values({
        issueNumber,
        title: input.title,
        description: input.description,
        state: "active",
        areaId: input.areaId,
        priority: input.priority ?? 0,
        position,
        earliestStart: input.earliestStart,
        preferredStart: input.preferredStart,
        preferredEnd: input.preferredEnd,
        softDeadline: input.softDeadline,
        hardDeadline: input.hardDeadline,
        estimatedMinutes: input.estimatedMinutes,
        remainingMinutes: input.remainingMinutes ?? input.estimatedMinutes,
        sessionMinutes: input.sessionMinutes,
        isSplittable: input.isSplittable === false ? 0 : 1,
        schedulingMode: input.schedulingMode ?? "suggested",
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    logActivity(tx, task.id, "created");
    return task;
  });
}

export function listTasks() {
  return db.select().from(tasks).where(sql`${tasks.state} != 'archived'`).orderBy(asc(tasks.position)).all();
}

export function getTask(taskId: string) {
  return db.select().from(tasks).where(eq(tasks.id, taskId)).get();
}

/** For the Task Detail drawer's Activity tab (spec 10.2) — every logActivity() call above. */
export function listActivityForTask(taskId: string) {
  return db
    .select()
    .from(activityLog)
    .where(and(eq(activityLog.entityType, "task"), eq(activityLog.entityId, taskId)))
    .orderBy(desc(activityLog.createdAt))
    .all();
}

/**
 * Selects the dashboard's In Progress / Urgent / Active Next lists (spec 6.4). "Urgent"
 * covers overdue tasks, tasks due within the next 24h, and tasks whose preferred window
 * closes within 2h; it does not yet account for insufficient scheduled time, which needs
 * work-session aggregation from Stage 5+. "Active Next" excludes anything already shown as
 * urgent, blocked tasks, and tasks snoozed into the future, and is capped at 5 per spec 6.4.
 */
export function getDashboardTaskLists(now: number) {
  const dueSoonHorizon = now + 24 * 60 * 60 * 1000;
  const windowClosingHorizon = now + 2 * 60 * 60 * 1000;

  const all = db.select().from(tasks).where(sql`${tasks.state} != 'archived'`).all();

  const inProgress = all.filter((t) => t.state === "in_progress").sort((a, b) => a.position - b.position);

  const urgentIds = new Set<string>();
  const urgent = all
    .filter((t) => {
      if (t.state !== "active" && t.state !== "in_progress") return false;
      const overdue = t.hardDeadline !== null && t.hardDeadline < now;
      const dueSoon = t.hardDeadline !== null && t.hardDeadline >= now && t.hardDeadline <= dueSoonHorizon;
      const windowClosing = t.preferredEnd !== null && t.preferredEnd >= now && t.preferredEnd <= windowClosingHorizon;
      const isUrgent = overdue || dueSoon || windowClosing;
      if (isUrgent) urgentIds.add(t.id);
      return isUrgent;
    })
    .sort((a, b) => (a.hardDeadline ?? Infinity) - (b.hardDeadline ?? Infinity));

  const activeNext = all
    .filter(
      (t) =>
        t.state === "active" &&
        !urgentIds.has(t.id) &&
        !t.blockedReason &&
        (t.earliestStart === null || t.earliestStart <= now),
    )
    .sort((a, b) => b.priority - a.priority || a.position - b.position)
    .slice(0, 5);

  return { inProgress, urgent, activeNext };
}

export function getBoard() {
  const rows = listTasks();
  return {
    active: rows.filter((t) => t.state === "active"),
    inProgress: rows.filter((t) => t.state === "in_progress"),
    resolved: rows.filter((t) => t.state === "resolved"),
  };
}

export function updateTask(taskId: string, input: Partial<TaskInput>, expectedVersion: number) {
  return db.transaction((tx) => {
    const current = tx.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!current) throw new NotFoundError();
    if (current.version !== expectedVersion) throw new ConflictError();

    const task = tx
      .update(tasks)
      .set({
        ...input,
        isSplittable: input.isSplittable === undefined ? undefined : input.isSplittable ? 1 : 0,
        version: current.version + 1,
        updatedAt: Date.now(),
      })
      .where(eq(tasks.id, taskId))
      .returning()
      .get();

    logActivity(tx, taskId, "updated");
    return task;
  });
}

export interface MoveInput {
  toState: TaskState;
  previousTaskId?: string;
  nextTaskId?: string;
  expectedVersion: number;
}

export function moveTask(taskId: string, input: MoveInput) {
  return db.transaction((tx) => {
    const current = tx.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!current) throw new NotFoundError();
    if (current.version !== input.expectedVersion) throw new ConflictError();

    const position = computePosition(tx, input.toState, input.previousTaskId, input.nextTaskId);

    const task = tx
      .update(tasks)
      .set({
        state: input.toState,
        position,
        resolvedAt: input.toState === "resolved" ? Date.now() : current.state === "resolved" ? null : current.resolvedAt,
        version: current.version + 1,
        updatedAt: Date.now(),
      })
      .where(eq(tasks.id, taskId))
      .returning()
      .get();

    logActivity(tx, taskId, "moved", { toState: input.toState });
    return task;
  }, { behavior: "immediate" });
}

function transition(taskId: string, expectedVersion: number, action: string, patch: Partial<typeof tasks.$inferInsert>) {
  return db.transaction((tx) => {
    const current = tx.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!current) throw new NotFoundError();
    if (current.version !== expectedVersion) throw new ConflictError();

    const task = tx
      .update(tasks)
      .set({ ...patch, version: current.version + 1, updatedAt: Date.now() })
      .where(eq(tasks.id, taskId))
      .returning()
      .get();

    logActivity(tx, taskId, action);
    return task;
  }, { behavior: "immediate" });
}

export function startTask(taskId: string, expectedVersion: number) {
  return db.transaction((tx) => {
    const current = tx.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!current) throw new NotFoundError();
    if (current.version !== expectedVersion) throw new ConflictError();

    const position = computePosition(tx, "in_progress");
    const task = tx
      .update(tasks)
      .set({ state: "in_progress", position, version: current.version + 1, updatedAt: Date.now() })
      .where(eq(tasks.id, taskId))
      .returning()
      .get();

    logActivity(tx, taskId, "started");
    return task;
  }, { behavior: "immediate" });
}

export function returnToActive(taskId: string, expectedVersion: number) {
  return db.transaction((tx) => {
    const current = tx.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!current) throw new NotFoundError();
    if (current.version !== expectedVersion) throw new ConflictError();

    const position = computePosition(tx, "active");
    const task = tx
      .update(tasks)
      .set({ state: "active", position, version: current.version + 1, updatedAt: Date.now() })
      .where(eq(tasks.id, taskId))
      .returning()
      .get();

    logActivity(tx, taskId, "returned_to_active");
    return task;
  }, { behavior: "immediate" });
}

export function resolveTask(taskId: string, expectedVersion: number) {
  return db.transaction((tx) => {
    const current = tx.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!current) throw new NotFoundError();
    if (current.version !== expectedVersion) throw new ConflictError();

    const now = Date.now();
    const position = computePosition(tx, "resolved");
    const task = tx
      .update(tasks)
      .set({ state: "resolved", position, progressPercent: 100, resolvedAt: now, version: current.version + 1, updatedAt: now })
      .where(eq(tasks.id, taskId))
      .returning()
      .get();

    tx.insert(taskResolutions).values({ taskId, resolvedAt: now }).run();
    closeSessionsForResolvedTask(tx, taskId, now);
    logActivity(tx, taskId, "resolved");
    return task;
  }, { behavior: "immediate" });
}

export function reopenTask(taskId: string, expectedVersion: number) {
  return db.transaction((tx) => {
    const current = tx.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!current) throw new NotFoundError();
    if (current.version !== expectedVersion) throw new ConflictError();

    const position = computePosition(tx, "active");
    const task = tx
      .update(tasks)
      .set({ state: "active", position, resolvedAt: null, version: current.version + 1, updatedAt: Date.now() })
      .where(eq(tasks.id, taskId))
      .returning()
      .get();

    logActivity(tx, taskId, "reopened");
    return task;
  }, { behavior: "immediate" });
}

export function snoozeTask(taskId: string, expectedVersion: number, until: number) {
  return transition(taskId, expectedVersion, "snoozed", { earliestStart: until });
}

export function blockTask(taskId: string, expectedVersion: number, reason: string) {
  return transition(taskId, expectedVersion, "blocked", { blockedReason: reason });
}

export function unblockTask(taskId: string, expectedVersion: number) {
  return transition(taskId, expectedVersion, "unblocked", { blockedReason: null });
}
