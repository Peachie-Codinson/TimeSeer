import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { quotas, workSessions } from "../../db/schema.js";

export class NotFoundError extends Error {}

export interface QuotaInput {
  scopeType: string;
  scopeId?: string;
  period: string;
  weekday?: number;
  minimumMinutes?: number;
  targetMinutes?: number;
  maximumMinutes?: number;
  active?: boolean;
}

export function listQuotas() {
  return db.select().from(quotas).all();
}

export function createQuota(input: QuotaInput) {
  return db
    .insert(quotas)
    .values({
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      period: input.period,
      weekday: input.weekday,
      minimumMinutes: input.minimumMinutes,
      targetMinutes: input.targetMinutes,
      maximumMinutes: input.maximumMinutes,
      active: input.active === false ? 0 : 1,
    })
    .returning()
    .get();
}

export function updateQuota(id: string, input: Partial<QuotaInput>) {
  const row = db
    .update(quotas)
    .set({ ...input, active: input.active === undefined ? undefined : input.active ? 1 : 0 })
    .where(eq(quotas.id, id))
    .returning()
    .get();
  if (!row) throw new NotFoundError();
  return row;
}

export function deleteQuota(id: string) {
  db.delete(quotas).where(eq(quotas.id, id)).run();
}

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Compact daily quota summary for the dashboard (spec 6.4 / 12.7). Looks for an active
 * global/daily quota, preferring one pinned to today's weekday over a generic one. Scheduled
 * and completed minutes are summed from today's work sessions.
 */
export function computeQuotaSummary(now: number = Date.now()) {
  const dayStartMs = startOfDay(now);
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;
  const weekday = new Date(dayStartMs).getDay();

  const candidates = db
    .select()
    .from(quotas)
    .where(and(eq(quotas.scopeType, "global"), eq(quotas.period, "daily"), eq(quotas.active, 1)))
    .all();
  const quota = candidates.find((q) => q.weekday === weekday) ?? candidates.find((q) => q.weekday === null);
  const targetMinutes = quota?.targetMinutes ?? 0;

  const sessionsToday = db
    .select()
    .from(workSessions)
    .where(and(gte(workSessions.startsAt, dayStartMs), lt(workSessions.startsAt, dayEndMs)))
    .all();

  let completedMinutes = 0;
  let scheduledMinutes = 0;
  for (const session of sessionsToday) {
    if (session.status === "completed" || session.status === "partial") {
      completedMinutes += session.actualMinutes ?? 0;
    } else if (session.status === "planned" || session.status === "in_progress") {
      scheduledMinutes += session.plannedMinutes;
    }
  }

  return {
    completedMinutes,
    scheduledMinutes,
    targetMinutes,
    remainingMinutes: Math.max(0, targetMinutes - completedMinutes),
  };
}
