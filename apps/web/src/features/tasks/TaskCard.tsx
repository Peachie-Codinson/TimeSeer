import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { taskBadges } from "./badges";
import type { Task } from "./types";

export function TaskCard({
  task,
  onClick,
  onStart,
  onResolve,
}: {
  task: Task;
  onClick: () => void;
  onStart?: () => void;
  onResolve?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const badges = taskBadges(task);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`cursor-pointer rounded-md border border-slate-800 bg-slate-900 p-3 text-sm hover:border-slate-600 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-slate-100">{task.title}</p>
        <span className="shrink-0 text-xs text-slate-600">#{task.issueNumber}</span>
      </div>
      {badges.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {badges.map((b) => (
            <span key={b.label} className={`rounded px-1.5 py-0.5 text-[11px] ${b.className}`}>
              {b.label}
            </span>
          ))}
        </div>
      )}
      {(onStart || onResolve) && (
        <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {onStart && (
            <button className="btn-secondary px-2 py-1 text-xs" onClick={onStart}>
              Start
            </button>
          )}
          {onResolve && (
            <button className="btn-secondary px-2 py-1 text-xs" onClick={onResolve}>
              Resolve
            </button>
          )}
        </div>
      )}
    </div>
  );
}
