import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";
import type { Area } from "../areas/api";
import { taskBadges } from "./badges";
import { formatDueLabel, formatRemainingLabel } from "./format";
import type { Task } from "./types";

function CardBody({
  task,
  area,
  density,
  onOpen,
  hideContent,
}: {
  task: Task;
  area: Area | undefined;
  density: "comfortable" | "compact";
  onOpen: () => void;
  hideContent?: boolean;
}) {
  const deadline = task.hardDeadline ?? task.softDeadline;
  const hasDeadline = deadline !== null && deadline !== undefined;
  // "Due today" duplicates the due-date meta line below (which already says "Due today"/"tomorrow"/
  // a date); drop it here so the card doesn't show two conflicting-looking due statements.
  const badges = taskBadges(task).filter((b) => b.label !== "Due today");
  const padding = density === "compact" ? "9px 10px" : "var(--space-4)";

  return (
    <div style={{ padding, position: "relative", visibility: hideContent ? "hidden" : "visible" }}>
      {hideContent && <div className="nc-drop-placeholder" style={{ position: "absolute", inset: 0 }} />}
      {area && (
        <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 4 }}>
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: area.color ?? "var(--color-accent)",
              boxShadow: "0 0 0 2px var(--color-surface)",
            }}
          />
        </div>
      )}
      <div className="nc-card-kicker" style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 36 }}>
        <span>
          #{task.issueNumber}
          {area ? ` · ${area.name}` : ""}
        </span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="nc-card-title"
        style={{
          display: "block",
          margin: "4px 0 6px",
          color: "var(--color-text)",
          background: "none",
          border: "none",
          padding: 0,
          textAlign: "left",
          cursor: "pointer",
          width: "100%",
        }}
      >
        {task.title}
      </button>
      {hasDeadline && (
        <div className="nc-card-meta" style={{ marginBottom: 4 }}>
          {formatDueLabel(deadline)}
          {task.remainingMinutes !== null ? ` · ${formatRemainingLabel(task.remainingMinutes)}` : ""}
        </div>
      )}
      {badges.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {badges.map((b) => (
            <div key={b.label} className="nc-tag nc-tag-outline">
              {b.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** The floating "lifted" preview shown in the DndContext's DragOverlay while a card is held. */
export function TaskCardPreview({
  task,
  area,
  density,
}: {
  task: Task;
  area: Area | undefined;
  density: "comfortable" | "compact";
}) {
  return (
    <div
      className="nc-card"
      style={{
        transform: "scale(1.05) rotate(2deg)",
        boxShadow: "0 0 0 2px var(--color-accent), 0 26px 46px rgba(0,0,0,0.55), 0 6px 12px rgba(0,0,0,0.35)",
      }}
    >
      <CardBody task={task} area={area} density={density} onOpen={() => {}} />
    </div>
  );
}

export function TaskCard({
  task,
  area,
  density,
  onOpen,
  burning,
}: {
  task: Task;
  area: Area | undefined;
  density: "comfortable" | "compact";
  onOpen: () => void;
  /** True while this card is animating out after an Immolate flush. */
  burning?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
  };

  return (
    <div ref={setNodeRef} style={style} className={`nc-card${burning ? " nc-immolating" : ""}`} {...attributes} {...listeners}>
      <CardBody task={task} area={area} density={density} onOpen={onOpen} hideContent={isDragging} />
    </div>
  );
}
