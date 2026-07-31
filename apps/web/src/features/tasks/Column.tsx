import { FireIcon } from "@phosphor-icons/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import type { Task, TaskState } from "./types";

const EMPTY_COPY: Record<TaskState, { title: string; sub: string }> = {
  active: { title: "No active tasks", sub: "Create a task or reopen one from Archive." },
  in_progress: { title: "Nothing in progress", sub: "Drag an Active task here when you begin working." },
  resolved: { title: "No recently resolved tasks", sub: "Completed tasks remain here until the weekly flush." },
  archived: { title: "", sub: "" },
};

export function Column({
  id,
  title,
  tasks,
  onImmolate,
  immolating,
  children,
}: {
  id: TaskState;
  title: string;
  tasks: Task[];
  onImmolate?: () => void;
  immolating?: boolean;
  children: (task: Task) => ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id });
  const empty = EMPTY_COPY[id];

  return (
    <div
      style={{
        flex: 1,
        minWidth: 300,
        display: "flex",
        flexDirection: "column",
        background: "var(--color-neutral-900)",
        border: "1px solid var(--color-divider)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "var(--space-4)",
          borderBottom: "1px solid var(--color-divider)",
          position: "sticky",
          top: 0,
          background: "var(--color-neutral-900)",
          zIndex: 2,
        }}
      >
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 14 }}>{title}</div>
        <div className="nc-tag nc-tag-neutral">{tasks.length}</div>
        {onImmolate && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button
              type="button"
              className="nc-btn nc-btn-secondary"
              style={{ color: "var(--color-accent-300)" }}
              disabled={immolating}
              onClick={onImmolate}
            >
              <FireIcon size={15} />
              Immolate
            </button>
          </div>
        )}
      </div>
      <SortableContext id={id} items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "var(--space-3)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {tasks.map((task) => children(task))}
          {tasks.length === 0 && (
            <div style={{ padding: "20px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{empty.title}</div>
              <div style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>{empty.sub}</div>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
