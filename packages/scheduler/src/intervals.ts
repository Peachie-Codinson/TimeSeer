import type { BusyInterval, WorkingHours } from "./types.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ms: number, days: number): number {
  return ms + days * DAY_MS;
}

/** The working-hours window for the given day, or null if that weekday isn't a working day. */
export function getWorkingWindow(dayStart: number, workingHours: WorkingHours): BusyInterval | null {
  const weekday = new Date(dayStart).getDay();
  if (!workingHours.daysOfWeek.includes(weekday)) return null;
  return {
    start: dayStart + workingHours.startMinute * MINUTE_MS,
    end: dayStart + workingHours.endMinute * MINUTE_MS,
  };
}

/** Subtracts every overlapping busy interval from `window`, returning the remaining free chunks in order. */
export function subtractBusy(window: BusyInterval, busyIntervals: BusyInterval[]): BusyInterval[] {
  const relevant = busyIntervals
    .filter((b) => b.end > window.start && b.start < window.end)
    .sort((a, b) => a.start - b.start);

  const free: BusyInterval[] = [];
  let cursor = window.start;

  for (const busy of relevant) {
    if (busy.start > cursor) {
      free.push({ start: cursor, end: Math.min(busy.start, window.end) });
    }
    cursor = Math.max(cursor, busy.end);
    if (cursor >= window.end) break;
  }

  if (cursor < window.end) free.push({ start: cursor, end: window.end });

  return free.filter((f) => f.end - f.start > 0);
}

export { DAY_MS, MINUTE_MS };
