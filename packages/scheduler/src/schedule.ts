import { DAY_MS, addDays, getWorkingWindow, startOfDay, subtractBusy } from "./intervals.js";
import type {
  BusyInterval,
  RiskWarning,
  ScheduleInput,
  ScheduleProposal,
  ScheduleResult,
  SchedulableTask,
  UnscheduledTask,
} from "./types.js";

const DEFAULT_MIN_SESSION_MINUTES = 15;
const DEFAULT_SESSION_MINUTES = 60;
const MAX_DAYS_SCANNED = 120; // safety bound; callers pass realistic planning windows

function sortKey(task: SchedulableTask, now: number, totalFreeMinutes: number): (number | boolean)[] {
  const overdue = task.hardDeadline !== null && task.hardDeadline < now;
  const remainingToFreeRatio =
    task.remainingMinutes !== null && totalFreeMinutes > 0 ? task.remainingMinutes / totalFreeMinutes : 0;

  return [
    task.preferredEnd ?? Infinity, // time-gate closing soonest first
    task.hardDeadline ?? Infinity,
    overdue ? 0 : 1,
    -remainingToFreeRatio, // tasks that need a bigger share of what's left go first
    -task.priority,
    task.position,
  ];
}

function compareKeys(a: (number | boolean)[], b: (number | boolean)[]): number {
  for (let i = 0; i < a.length; i++) {
    const av = Number(a[i]);
    const bv = Number(b[i]);
    if (av !== bv) return av - bv;
  }
  return 0;
}

function estimateTotalFreeMinutes(input: ScheduleInput): number {
  let total = 0;
  let dayCursor = startOfDay(input.rangeStart);
  const rangeEndDay = startOfDay(input.rangeEnd) + DAY_MS;
  let daysScanned = 0;

  while (dayCursor < rangeEndDay && daysScanned < MAX_DAYS_SCANNED) {
    const window = getWorkingWindow(dayCursor, input.workingHours);
    if (window) {
      const clamped = { start: Math.max(window.start, input.rangeStart), end: Math.min(window.end, input.rangeEnd) };
      if (clamped.end > clamped.start) {
        for (const chunk of subtractBusy(clamped, input.busyIntervals)) {
          total += (chunk.end - chunk.start) / 60_000;
        }
      }
    }
    dayCursor = addDays(dayCursor, 1);
    daysScanned++;
  }

  return total;
}

function explain(task: SchedulableTask, now: number, durationMinutes: number): string {
  if (task.hardDeadline !== null && task.hardDeadline < now) {
    return `Scheduled ${durationMinutes}m for "${task.title}" — overdue, placed at the earliest available time.`;
  }
  if (task.preferredEnd !== null) {
    return `Scheduled ${durationMinutes}m for "${task.title}" — its preferred window is closing.`;
  }
  if (task.hardDeadline !== null) {
    return `Scheduled ${durationMinutes}m for "${task.title}" — has a hard deadline.`;
  }
  if (task.priority > 0) {
    return `Scheduled ${durationMinutes}m for "${task.title}" — high priority.`;
  }
  return `Scheduled ${durationMinutes}m for "${task.title}".`;
}

export function proposeSchedule(rawInput: ScheduleInput): ScheduleResult {
  // The caller's rangeStart reflects what's visible (e.g. a calendar week view, which spans
  // the whole week even when "today" falls in the middle of it) — never propose sessions
  // before now, regardless of what range was requested.
  const input: ScheduleInput = { ...rawInput, rangeStart: Math.max(rawInput.rangeStart, rawInput.now) };

  const minSessionMinutes = input.minSessionMinutes ?? DEFAULT_MIN_SESSION_MINUTES;
  const defaultSessionMinutes = input.defaultSessionMinutes ?? DEFAULT_SESSION_MINUTES;
  const totalFreeMinutes = estimateTotalFreeMinutes(input);

  const schedulable = input.tasks.filter((t) => t.schedulingMode !== "manual");
  const sorted = [...schedulable].sort((a, b) =>
    compareKeys(sortKey(a, input.now, totalFreeMinutes), sortKey(b, input.now, totalFreeMinutes)),
  );

  const proposals: ScheduleProposal[] = [];
  const unscheduled: UnscheduledTask[] = [];
  const risks: RiskWarning[] = [];

  // Busy time grows as we place sessions, so later (lower-priority) tasks see earlier ones as blocked.
  const busy: BusyInterval[] = [...input.busyIntervals];
  const dailyUsedMinutes = new Map<number, number>();

  for (const task of sorted) {
    const overdue = task.hardDeadline !== null && task.hardDeadline < input.now;
    if (overdue) {
      risks.push({ taskId: task.id, severity: "critical", message: "Overdue." });
    }

    let remaining = task.remainingMinutes ?? 0;
    if (remaining <= 0) continue;

    const earliest = Math.max(input.rangeStart, task.earliestStart ?? input.rangeStart);
    const latest = Math.min(input.rangeEnd, task.hardDeadline ?? input.rangeEnd);

    if (earliest >= latest) {
      unscheduled.push({
        taskId: task.id,
        reason:
          task.earliestStart !== null && task.earliestStart > input.rangeEnd
            ? "Its time gate doesn't open within the visible range."
            : "No time available before its deadline within the visible range.",
      });
      continue;
    }

    const sessionTarget = Math.min(task.sessionMinutes ?? defaultSessionMinutes, remaining);
    let placedAny = false;
    let dayCursor = startOfDay(earliest);
    let daysScanned = 0;

    while (dayCursor < latest && remaining > 0 && daysScanned < MAX_DAYS_SCANNED) {
      const window = getWorkingWindow(dayCursor, input.workingHours);
      daysScanned++;

      if (window) {
        const clamped = { start: Math.max(window.start, earliest), end: Math.min(window.end, latest) };

        if (clamped.end > clamped.start) {
          const dailyCap = input.quota.maximumMinutes ?? Infinity;
          const dailyUsed = dailyUsedMinutes.get(dayCursor) ?? 0;
          const dailyBudget = Math.max(0, dailyCap - dailyUsed);

          if (dailyBudget >= minSessionMinutes) {
            for (const chunk of subtractBusy(clamped, busy)) {
              if (remaining <= 0) break;

              const chunkMinutes = (chunk.end - chunk.start) / 60_000;
              const cap = Math.min(chunkMinutes, dailyBudget, remaining);
              const duration = task.isSplittable ? Math.min(cap, sessionTarget) : cap >= sessionTarget ? sessionTarget : 0;

              if (duration < minSessionMinutes) continue;

              const start = chunk.start;
              const end = start + duration * 60_000;

              proposals.push({ taskId: task.id, startsAt: start, endsAt: end, explanation: explain(task, input.now, duration) });
              busy.push({ start, end });
              dailyUsedMinutes.set(dayCursor, (dailyUsedMinutes.get(dayCursor) ?? 0) + duration);
              remaining -= duration;
              placedAny = true;

              if (!task.isSplittable) break;
            }
          }
        }
      }

      dayCursor = addDays(dayCursor, 1);
    }

    if (remaining > 0) {
      unscheduled.push({
        taskId: task.id,
        reason: placedAny
          ? "Partially scheduled; not enough free time remained for the rest before its deadline."
          : "No free time slot found before its deadline.",
      });
    }

    if (!overdue && task.hardDeadline !== null && remaining > 0) {
      risks.push({ taskId: task.id, severity: "warning", message: "Insufficient time scheduled before the deadline." });
    }
  }

  return { proposals, unscheduled, risks };
}
