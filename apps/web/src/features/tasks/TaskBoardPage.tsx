import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchAreas } from "../areas/api";
import { flushArchive, flushPreview } from "../archive/api";
import "../../styles/nocturne.css";
import { AppSidebar } from "../../components/AppSidebar";
import { fetchBoard, moveTask } from "./api";
import { Column } from "./Column";
import { QuickAddModal } from "./QuickAddModal";
import { TaskCard, TaskCardPreview } from "./TaskCard";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import type { Board, Task, TaskState } from "./types";

const COLUMNS: { id: TaskState; title: string }[] = [
  { id: "active", title: "Active" },
  { id: "in_progress", title: "In Progress" },
  { id: "resolved", title: "Resolved" },
];

function columnKey(state: TaskState): keyof Board {
  if (state === "active") return "active";
  if (state === "in_progress") return "inProgress";
  return "resolved";
}

function findContainer(id: string, board: Board): TaskState | undefined {
  if (id === "active" || id === "in_progress" || id === "resolved") return id as TaskState;
  if (board.active.some((t) => t.id === id)) return "active";
  if (board.inProgress.some((t) => t.id === id)) return "in_progress";
  if (board.resolved.some((t) => t.id === id)) return "resolved";
  return undefined;
}

const emptyBoard: Board = { active: [], inProgress: [], resolved: [] };
const IMMOLATE_ANIM_MS = 480;

export function TaskBoardPage() {
  const queryClient = useQueryClient();
  const { data: board } = useQuery({ queryKey: ["board"], queryFn: fetchBoard });
  const { data: areas = [] } = useQuery({ queryKey: ["areas"], queryFn: fetchAreas });
  const [localBoard, setLocalBoard] = useState<Board | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [burningIds, setBurningIds] = useState<Set<string>>(new Set());
  const [immolating, setImmolating] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const current = localBoard ?? board ?? emptyBoard;
  const areaById = new Map(areas.map((a) => [a.id, a]));

  const refetchBoard = () => {
    queryClient.invalidateQueries({ queryKey: ["board"] });
    queryClient.invalidateQueries({ queryKey: ["archive"] });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const all = [...current.active, ...current.inProgress, ...current.resolved];
    setActiveTask(all.find((t) => t.id === event.active.id) ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const base = localBoard ?? board;
    if (!base) return;

    const activeContainer = findContainer(String(active.id), base);
    const overContainer = findContainer(String(over.id), base);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setLocalBoard((prev) => {
      const src = prev ?? base;
      const activeKey = columnKey(activeContainer);
      const overKey = columnKey(overContainer);
      const activeItems = src[activeKey];
      const overItems = src[overKey];
      const activeIndex = activeItems.findIndex((t) => t.id === active.id);
      if (activeIndex === -1) return src;

      const moved = activeItems[activeIndex];
      const newActiveItems = activeItems.filter((t) => t.id !== active.id);
      let overIndex = overItems.findIndex((t) => t.id === over.id);
      if (overIndex === -1) overIndex = overItems.length;

      const newOverItems = [...overItems];
      newOverItems.splice(overIndex, 0, moved);

      return { ...src, [activeKey]: newActiveItems, [overKey]: newOverItems };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    const base = localBoard ?? board;
    if (!over || !base) return;

    const container = findContainer(String(active.id), base);
    if (!container) return;

    const items = base[columnKey(container)];
    const index = items.findIndex((t) => t.id === active.id);
    if (index === -1) return;
    const previousTaskId = index > 0 ? items[index - 1].id : undefined;
    const nextTaskId = index < items.length - 1 ? items[index + 1].id : undefined;
    const task = items[index];

    try {
      await moveTask(task.id, { toState: container, previousTaskId, nextTaskId, expectedVersion: task.version });
    } finally {
      setLocalBoard(null);
      refetchBoard();
    }
  };

  const immolate = async () => {
    if (immolating) return;
    setImmolating(true);
    try {
      const { taskIds } = await flushPreview();
      if (taskIds.length === 0) return;
      setBurningIds(new Set(taskIds));
      await new Promise((resolve) => setTimeout(resolve, IMMOLATE_ANIM_MS));
      await flushArchive(taskIds);
      refetchBoard();
    } finally {
      setBurningIds(new Set());
      setImmolating(false);
    }
  };

  return (
    <div className="nc-shell" style={{ height: "100vh", width: "100vw", display: "flex", overflow: "hidden" }}>
      <AppSidebar />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div
          className="nc-hover"
          style={{
            height: "auto",
            minHeight: 52,
            flex: "none",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "var(--space-4)",
            rowGap: 6,
            borderBottom: "1px solid var(--color-divider)",
            padding: "8px var(--space-6)",
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 15, marginRight: "auto" }}>Tasks</div>
          <div style={{ flex: 1, maxWidth: 320, minWidth: 60 }}>
            <div
              className="nc-input"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                color: "color-mix(in srgb, var(--color-text) 55%, transparent)",
                overflow: "hidden",
              }}
            >
              <MagnifyingGlassIcon size={16} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Search…</span>
            </div>
          </div>
          <div className="nc-seg" style={{ flex: "none" }}>
            <label
              className="nc-seg-opt"
              style={density === "comfortable" ? { color: "var(--color-accent)" } : undefined}
            >
              <input type="radio" name="density" checked={density === "comfortable"} onChange={() => setDensity("comfortable")} />
              Comfortable
            </label>
            <label className="nc-seg-opt" style={density === "compact" ? { color: "var(--color-accent)" } : undefined}>
              <input type="radio" name="density" checked={density === "compact"} onChange={() => setDensity("compact")} />
              Compact
            </label>
          </div>
          <button type="button" className="nc-btn nc-btn-primary" style={{ flex: "none" }} onClick={() => setQuickAddOpen(true)}>
            <PlusIcon size={16} />
            New Task
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "var(--space-6)" }}>
          <div style={{ display: "flex", gap: "var(--space-6)", minWidth: 960, height: "100%" }}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              {COLUMNS.map((col) => (
                <Column
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  tasks={current[columnKey(col.id)]}
                  onImmolate={col.id === "resolved" && current.resolved.length > 0 ? () => void immolate() : undefined}
                  immolating={immolating}
                >
                  {(task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      area={task.areaId ? areaById.get(task.areaId) : undefined}
                      density={density}
                      onOpen={() => setSelectedTask(task)}
                      burning={burningIds.has(task.id)}
                    />
                  )}
                </Column>
              ))}
              <DragOverlay>
                {activeTask && (
                  <TaskCardPreview
                    task={activeTask}
                    area={activeTask.areaId ? areaById.get(activeTask.areaId) : undefined}
                    density={density}
                  />
                )}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>

      {quickAddOpen && (
        <QuickAddModal
          areas={areas}
          onClose={() => setQuickAddOpen(false)}
          onCreated={() => {
            setQuickAddOpen(false);
            refetchBoard();
          }}
        />
      )}

      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          areas={areas}
          onClose={() => setSelectedTask(null)}
          onChanged={() => {
            setSelectedTask(null);
            refetchBoard();
          }}
        />
      )}
    </div>
  );
}
