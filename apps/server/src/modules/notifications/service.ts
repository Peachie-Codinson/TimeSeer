import { and, desc, eq, or } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { scheduledJobs, tasks } from "../../db/schema.js";
import { expandEventsInRange } from "../calendar/service.js";
import { listWorkSessionsInRange } from "../work-sessions/service.js";

export type NotificationType =
  | "event_starting"
  | "session_starting"
  | "deadline_approaching"
  | "gate_opening"
  | "gate_closing"
  | "overdue"
  | "archive_completed";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  relatedId: string | null;
  severity: "info" | "warning" | "critical";
  at: number;
}

const IMMINENT_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const GATE_CLOSING_MS = 2 * 60 * 60 * 1000;

/**
 * Computes the in-app reminder center's contents on read (spec 15), rather than persisting
 * fired-notification rows — there's nothing to reconcile or clean up, and the set is cheap to
 * derive from data we already have.
 */
export function computeNotifications(now: number = Date.now()): Notification[] {
  const notifications: Notification[] = [];
  const imminent = now + IMMINENT_MS;

  for (const event of expandEventsInRange(now, imminent)) {
    if (event.startsAt >= now && event.startsAt <= imminent) {
      notifications.push({
        id: `event:${event.id}:${event.occurrenceStart}`,
        type: "event_starting",
        message: `"${event.title}" starts soon`,
        relatedId: event.id,
        severity: "info",
        at: event.startsAt,
      });
    }
  }

  for (const session of listWorkSessionsInRange(now, imminent)) {
    if (session.status === "planned" && session.startsAt >= now && session.startsAt <= imminent) {
      notifications.push({
        id: `session:${session.id}`,
        type: "session_starting",
        message: "A scheduled work session starts soon",
        relatedId: session.taskId,
        severity: "info",
        at: session.startsAt,
      });
    }
  }

  const activeTasks = db
    .select()
    .from(tasks)
    .where(or(eq(tasks.state, "active"), eq(tasks.state, "in_progress")))
    .all();

  const dayAhead = now + DAY_MS;
  const gateClosingSoon = now + GATE_CLOSING_MS;

  for (const task of activeTasks) {
    if (task.hardDeadline !== null) {
      if (task.hardDeadline < now) {
        notifications.push({
          id: `overdue:${task.id}`,
          type: "overdue",
          message: `"${task.title}" is overdue`,
          relatedId: task.id,
          severity: "critical",
          at: task.hardDeadline,
        });
      } else if (task.hardDeadline <= dayAhead) {
        notifications.push({
          id: `deadline:${task.id}`,
          type: "deadline_approaching",
          message: `"${task.title}" is due soon`,
          relatedId: task.id,
          severity: "warning",
          at: task.hardDeadline,
        });
      }
    }

    if (task.earliestStart !== null && task.earliestStart >= now && task.earliestStart <= imminent) {
      notifications.push({
        id: `gate-open:${task.id}`,
        type: "gate_opening",
        message: `"${task.title}"'s time gate opens soon`,
        relatedId: task.id,
        severity: "info",
        at: task.earliestStart,
      });
    }

    if (task.preferredEnd !== null && task.preferredEnd >= now && task.preferredEnd <= gateClosingSoon) {
      notifications.push({
        id: `gate-close:${task.id}`,
        type: "gate_closing",
        message: `"${task.title}"'s preferred window is closing`,
        relatedId: task.id,
        severity: "warning",
        at: task.preferredEnd,
      });
    }
  }

  const recentFlush = db
    .select()
    .from(scheduledJobs)
    .where(and(eq(scheduledJobs.kind, "archive-flush"), eq(scheduledJobs.status, "completed")))
    .orderBy(desc(scheduledJobs.completedAt))
    .limit(1)
    .get();

  if (recentFlush?.completedAt && now - recentFlush.completedAt < DAY_MS) {
    notifications.push({
      id: `archive-flush:${recentFlush.id}`,
      type: "archive_completed",
      message: "The weekly archive flush completed",
      relatedId: null,
      severity: "info",
      at: recentFlush.completedAt,
    });
  }

  return notifications.sort((a, b) => a.at - b.at);
}
