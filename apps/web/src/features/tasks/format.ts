function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Due today" / "Due tomorrow" / "Due Jul 22", relative to `now`. */
export function formatDueLabel(deadlineMs: number, now: number = Date.now()): string {
  const due = new Date(deadlineMs);
  const today = new Date(now);
  if (sameDay(due, today)) return "Due today";
  const tomorrow = new Date(now + 24 * 60 * 60 * 1000);
  if (sameDay(due, tomorrow)) return "Due tomorrow";
  return `Due ${MONTHS[due.getMonth()]} ${due.getDate()}`;
}

/** "1h 30m left" / "45m left", floored at 0. */
export function formatRemainingLabel(minutes: number): string {
  const mins = Math.max(0, Math.round(minutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m left`;
  if (m === 0) return `${h}h left`;
  return `${h}h ${m}m left`;
}
