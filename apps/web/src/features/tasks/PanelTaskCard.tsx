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
      className={`nc-card${draggable ? " planner-draggable-task" : ""}`}
      style={{ padding: "var(--space-3)", cursor: draggable ? "grab" : "default" }}
      {...(draggable
        ? {
            "data-task-id": task.id,
            "data-title": task.title,
            "data-duration-minutes": durationMinutes,
          }
        : {})}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{task.title}</div>
        <span style={{ flex: "none", fontSize: 11, color: "color-mix(in srgb, var(--color-text) 40%, transparent)" }}>#{task.issueNumber}</span>
      </div>
      {badges.length > 0 && (
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {badges.map((b) => (
            <div key={b.label} className="nc-tag nc-tag-outline">
              {b.label}
            </div>
          ))}
        </div>
      )}
      {actions && actions.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
          {actions.map((a) => (
            <button key={a.label} type="button" className="nc-btn nc-btn-secondary" style={{ fontSize: 12, padding: "4px 8px" }} onClick={a.onClick}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
