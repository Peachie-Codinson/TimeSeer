import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { quotas, tasks, workSessions } from "../../db/schema.js";

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

export function getQuota(id: string) {
  return db.select().from(quotas).where(eq(quotas.id, id)).get();
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

/** Most recent Sunday 00:00 at or before `ms` (the app's week starts Sunday). */
function startOfWeek(ms: number) {
  const day = startOfDay(ms);
  const weekday = new Date(day).getDay();
  return day - weekday * 24 * 60 * 60 * 1000;
}

/**
 * Sums planned and completed minutes from work sessions falling in a quota's *current*
 * period (today for "daily", this week for "weekly"), scoped to the quota's area when
 * scopeType is "area" (via a join on the session's task). Spec 14: Planned/Completed/
 * Remaining columns in the Quotas table.
 */
export function computeProgressForQuota(quota: typeof quotas.$inferSelect, now: number = Date.now()) {
  const periodStart = quota.period === "weekly" ? startOfWeek(now) : startOfDay(now);
  const periodEnd = periodStart + (quota.period === "weekly" ? 7 : 1) * 24 * 60 * 60 * 1000;

  const inRange = and(gte(workSessions.startsAt, periodStart), lt(workSessions.startsAt, periodEnd));

  const sessions =
    quota.scopeType === "area" && quota.scopeId
      ? db
          .select({ status: workSessions.status, actualMinutes: workSessions.actualMinutes, plannedMinutes: workSessions.plannedMinutes })
          .from(workSessions)
          .innerJoin(tasks, eq(workSessions.taskId, tasks.id))
          .where(and(inRange, eq(tasks.areaId, quota.scopeId)))
          .all()
      : db
          .select({ status: workSessions.status, actualMinutes: workSessions.actualMinutes, plannedMinutes: workSessions.plannedMinutes })
          .from(workSessions)
          .where(inRange)
          .all();

  let completedMinutes = 0;
  let plannedMinutes = 0;
  for (const s of sessions) {
    if (s.status === "completed" || s.status === "partial") completedMinutes += s.actualMinutes ?? 0;
    else if (s.status === "planned" || s.status === "in_progress") plannedMinutes += s.plannedMinutes;
  }
  return { periodStart, periodEnd, plannedMinutes, completedMinutes };
}

export function computeAllQuotaProgress(now: number = Date.now()) {
  return listQuotas().map((q) => ({ quotaId: q.id, ...computeProgressForQuota(q, now) }));
}

/**
 * Progress for each of a quota's `count` *previous* periods (1 = last period, 2 = the one
 * before that, ...), for the Quotas UI's History row. Each entry is computed from real work
 * sessions the same way as the current period — there's no synthetic/placeholder data here.
 */
export function computeQuotaHistory(quota: typeof quotas.$inferSelect, count: number, now: number = Date.now()) {
  const periodDays = quota.period === "weekly" ? 7 : 1;
  const periodMs = periodDays * 24 * 60 * 60 * 1000;
  const history = [];
  for (let periodsAgo = 1; periodsAgo <= count; periodsAgo++) {
    const progress = computeProgressForQuota(quota, now - periodsAgo * periodMs);
    history.push({ periodsAgo, ...progress });
  }
  return history;
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
