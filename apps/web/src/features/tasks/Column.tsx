import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import type { Task } from "./types";

export function Column({
  id,
  title,
  tasks,
  children,
}: {
  id: string;
  title: string;
  tasks: Task[];
  children: (task: Task) => ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
        <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">{tasks.length}</span>
      </h2>
      <SortableContext id={id} items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-[80px] flex-1 flex-col gap-2 overflow-y-auto rounded-md p-1">
          {tasks.map((task) => children(task))}
        </div>
      </SortableContext>
    </div>
  );
}
