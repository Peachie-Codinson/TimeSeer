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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { fetchAreas } from "../areas/api";
import { flushArchive } from "../archive/api";
import { fetchBoard, moveTask, resolveTask, startTask } from "./api";
import { Column } from "./Column";
import { QuickAddForm } from "./QuickAddForm";
import { TaskCard } from "./TaskCard";
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

export function TaskBoardPage() {
  const queryClient = useQueryClient();
  const { data: board } = useQuery({ queryKey: ["board"], queryFn: fetchBoard });
  const { data: areas = [] } = useQuery({ queryKey: ["areas"], queryFn: fetchAreas });
  const [localBoard, setLocalBoard] = useState<Board | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedResolvedIds, setSelectedResolvedIds] = useState<Set<string>>(new Set());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const current = localBoard ?? board ?? emptyBoard;

  const refetchBoard = () => {
    queryClient.invalidateQueries({ queryKey: ["board"] });
    queryClient.invalidateQueries({ queryKey: ["archive"] });
  };

  const toggleResolvedSelection = (taskId: string) => {
    setSelectedResolvedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const immolate = async (taskIds?: string[]) => {
    await flushArchive(taskIds);
    setSelectedResolvedIds(new Set());
    refetchBoard();
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

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-slate-400 hover:text-white">
            ← Planner
          </Link>
          <h1 className="text-lg font-semibold">Tasks</h1>
          <Link to="/archive" className="text-sm text-slate-400 hover:text-white">
            Archive
          </Link>
        </div>
        <div className="w-80">
          <QuickAddForm onCreated={refetchBoard} />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid flex-1 grid-cols-3 gap-4 overflow-hidden p-4">
          {COLUMNS.map((col) => (
            <div key={col.id} className="flex min-h-0 flex-1 flex-col">
              {col.id === "resolved" && current.resolved.length > 0 && (
                <div className="mb-2 flex items-center gap-2 text-xs">
                  {selectedResolvedIds.size > 0 && (
                    <button
                      className="btn-secondary px-2 py-1 text-xs"
                      onClick={() => void immolate(Array.from(selectedResolvedIds))}
                    >
                      Immolate selected ({selectedResolvedIds.size})
                    </button>
                  )}
                  <button className="btn-secondary px-2 py-1 text-xs" onClick={() => void immolate()}>
                    Immolate all eligible
                  </button>
                </div>
              )}
              <Column id={col.id} title={col.title} tasks={current[columnKey(col.id)]}>
                {(task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setSelectedTask(task)}
                    selectable={col.id === "resolved"}
                    selected={selectedResolvedIds.has(task.id)}
                    onToggleSelect={() => toggleResolvedSelection(task.id)}
                    onStart={
                      task.state === "active"
                        ? () => startTask(task.id, task.version).then(refetchBoard)
                        : undefined
                    }
                    onResolve={
                      task.state === "active" || task.state === "in_progress"
                        ? () => resolveTask(task.id, task.version).then(refetchBoard)
                        : undefined
                    }
                  />
                )}
              </Column>
            </div>
          ))}
        </div>
        <DragOverlay>{activeTask && <TaskCard task={activeTask} onClick={() => {}} />}</DragOverlay>
      </DndContext>

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
