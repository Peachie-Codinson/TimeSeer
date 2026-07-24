import type { Task } from "./types";

export interface Badge {
  label: string;
  className: string;
}

export function taskBadges(task: Task, now: number = Date.now()): Badge[] {
  const badges: Badge[] = [];

  if (task.blockedReason) {
    badges.push({ label: "Blocked", className: "bg-amber-500/20 text-amber-300" });
  }
  if (task.state !== "resolved" && task.hardDeadline !== null && task.hardDeadline < now) {
    badges.push({ label: "Overdue", className: "bg-red-500/20 text-red-300" });
  } else if (
    task.state !== "resolved" &&
    task.hardDeadline !== null &&
    task.hardDeadline - now <= 24 * 60 * 60 * 1000
  ) {
    badges.push({ label: "Due today", className: "bg-orange-500/20 text-orange-300" });
  }
  if (
    task.state !== "resolved" &&
    task.preferredEnd !== null &&
    task.preferredEnd >= now &&
    task.preferredEnd - now <= 2 * 60 * 60 * 1000
  ) {
    badges.push({ label: "Time-gated", className: "bg-sky-500/20 text-sky-300" });
  }
  if (task.externalSource) {
    badges.push({ label: task.externalSource, className: "bg-slate-500/20 text-slate-300" });
  }

  return badges;
}
