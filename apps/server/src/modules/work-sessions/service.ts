import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { tasks, workSessions } from "../../db/schema.js";

export class NotFoundError extends Error {}

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

export function listWorkSessionsInRange(rangeStart: number, rangeEnd: number) {
  return db
    .select()
    .from(workSessions)
    .where(and(lt(workSessions.startsAt, rangeEnd), gt(workSessions.endsAt, rangeStart)))
    .all();
}
