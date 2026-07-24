import { taskBadges } from "./badges";
import type { Task } from "./types";

/** A lightweight task card for the dashboard's current-task panel — no dnd-kit sortable
 * (that requires a DndContext, which only the /tasks board provides). Cards passed
 * `draggable` expose the data attributes FullCalendar's external Draggable helper reads
 * to support dragging a task straight onto the calendar (spec 7.5). */
export function PanelTaskCard({
  task,
  draggable,
  actions,
}: {
  task: Task;
  draggable?: boolean;
  actions?: { label: string; onClick: () => void }[];
}) {
  const badges = taskBadges(task);
  const durationMinutes = task.sessionMinutes ?? task.estimatedMinutes ?? 30;

  return (
    <div
      className={`rounded-md border border-slate-800 bg-slate-900 p-2.5 text-sm ${
        draggable ? "planner-draggable-task cursor-grab active:cursor-grabbing" : ""
      }`}
      {...(draggable
        ? {
            "data-task-id": task.id,
            "data-title": task.title,
            "data-duration-minutes": durationMinutes,
          }
        : {})}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-slate-100">{task.title}</p>
        <span className="shrink-0 text-xs text-slate-600">#{task.issueNumber}</span>
      </div>
      {badges.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {badges.map((b) => (
            <span key={b.label} className={`rounded px-1.5 py-0.5 text-[11px] ${b.className}`}>
              {b.label}
            </span>
          ))}
        </div>
      )}
      {actions && actions.length > 0 && (
        <div className="mt-2 flex gap-2">
          {actions.map((a) => (
            <button key={a.label} className="btn-secondary px-2 py-1 text-xs" onClick={a.onClick}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
