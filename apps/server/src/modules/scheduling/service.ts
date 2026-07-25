import type { BusyInterval, SchedulableTask, ScheduleResult } from "@planner/scheduler";
import { proposeSchedule } from "@planner/scheduler";
import { and, eq, gt, lt, or } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { quotas, tasks, workSessions } from "../../db/schema.js";
import { expandEventsInRange } from "../calendar/service.js";
import { createWorkSession } from "../work-sessions/service.js";

// Matches the calendar's own businessHours config (apps/web CalendarView.tsx) since there's no
// per-owner working-hours setting yet.
const WORKING_HOURS = { daysOfWeek: [1, 2, 3, 4, 5], startMinute: 9 * 60, endMinute: 18 * 60 };

function gatherBusyIntervals(rangeStart: number, rangeEnd: number): BusyInterval[] {
  const events = expandEventsInRange(rangeStart, rangeEnd).map((e) => ({ start: e.startsAt, end: e.endsAt }));

  const sessions = db
    .select()
    .from(workSessions)
    .where(
      and(
        lt(workSessions.startsAt, rangeEnd),
        gt(workSessions.endsAt, rangeStart),
        or(eq(workSessions.locked, 1), eq(workSessions.status, "planned"), eq(workSessions.status, "in_progress")),
      ),
    )
    .all()
    .map((s) => ({ start: s.startsAt, end: s.endsAt }));

  return [...events, ...sessions];
}

function gatherSchedulableTasks(): SchedulableTask[] {
  return db
    .select()
    .from(tasks)
    .where(or(eq(tasks.state, "active"), eq(tasks.state, "in_progress")))
    .all()
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      position: t.position,
      earliestStart: t.earliestStart,
      preferredEnd: t.preferredEnd,
      hardDeadline: t.hardDeadline,
      remainingMinutes: t.remainingMinutes ?? t.estimatedMinutes,
      sessionMinutes: t.sessionMinutes,
      isSplittable: t.isSplittable === 1,
      schedulingMode: t.schedulingMode,
    }));
}

function getDailyMaxMinutes(): number | null {
  const quota = db
    .select()
    .from(quotas)
    .where(and(eq(quotas.scopeType, "global"), eq(quotas.period, "daily"), eq(quotas.active, 1)))
    .get();
  return quota?.maximumMinutes ?? null;
}

export function previewSchedule(rangeStart: number, rangeEnd: number): ScheduleResult {
  return proposeSchedule({
    tasks: gatherSchedulableTasks(),
    busyIntervals: gatherBusyIntervals(rangeStart, rangeEnd),
    workingHours: WORKING_HOURS,
    quota: { maximumMinutes: getDailyMaxMinutes() },
    rangeStart,
    rangeEnd,
    now: Date.now(),
  });
}

export function scheduleRisks(rangeStart: number, rangeEnd: number) {
  return previewSchedule(rangeStart, rangeEnd).risks;
}

export interface ApplyProposal {
  taskId: string;
  startsAt: number;
  endsAt: number;
}

export function applySchedule(proposals: ApplyProposal[]) {
  return proposals.map((p) =>
    createWorkSession({ taskId: p.taskId, startsAt: p.startsAt, endsAt: p.endsAt, automaticallyAdded: true }),
  );
}
