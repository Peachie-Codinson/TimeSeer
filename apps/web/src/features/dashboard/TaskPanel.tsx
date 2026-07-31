import { Draggable } from "@fullcalendar/interaction";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createQuota, fetchQuotas, updateQuota } from "../quotas/api";
import { PanelTaskCard } from "../tasks/PanelTaskCard";
import { returnToActive, snoozeTask, startTask } from "../tasks/api";
import type { Task } from "../tasks/types";
import { fetchDashboard } from "./api";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-slate-800 px-4 py-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </div>
  );
}

export function TaskPanel() {
  const queryClient = useQueryClient();
  const { start, end } = todayRange();
  const { data } = useQuery({
    queryKey: ["dashboard", start, end],
    queryFn: () => fetchDashboard(start, end),
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["dashboard"] });

  const draggableContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!draggableContainerRef.current) return;
    const draggable = new Draggable(draggableContainerRef.current, {
      itemSelector: ".planner-draggable-task",
      eventData: (el) => ({
        title: el.dataset.title,
        duration: { minutes: Number(el.dataset.durationMinutes) || 30 },
      }),
    });
    return () => draggable.destroy();
  }, []);

  const tasks = data?.tasks;
  const quota = data?.quotaSummary;
  const now = (tasks?.now ?? []) as unknown as Task[];
  const inProgress = (tasks?.inProgress ?? []) as unknown as Task[];
  const urgent = (tasks?.urgent ?? []) as unknown as Task[];
  const activeNext = (tasks?.activeNext ?? []) as unknown as Task[];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Section title="Now">
        {now.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing happening right now.</p>
        ) : (
          <div className="space-y-2">
            {now.map((task) => (
              <PanelTaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </Section>

      <Section title="In Progress">
        {inProgress.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks in progress.</p>
        ) : (
          <div className="space-y-2">
            {inProgress.map((task) => (
              <PanelTaskCard
                key={task.id}
                task={task}
                actions={[
                  { label: "Return to Active", onClick: () => returnToActive(task.id, task.version).then(refetch) },
                ]}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Urgent & Time-Gated">
        {urgent.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing urgent.</p>
        ) : (
          <div className="space-y-2">
            {urgent.map((task) => (
              <PanelTaskCard
                key={task.id}
                task={task}
                actions={
                  task.state === "active"
                    ? [{ label: "Start", onClick: () => startTask(task.id, task.version).then(refetch) }]
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Active Next">
        <div className="space-y-2" ref={draggableContainerRef}>
          {activeNext.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing queued. Add a task from the board.</p>
          ) : (
            <>
              <p className="text-[11px] text-slate-600">Drag a card onto the calendar to schedule it.</p>
              {activeNext.map((task) => (
                <PanelTaskCard
                  key={task.id}
                  task={task}
                  draggable
                  actions={[
                    { label: "Start", onClick: () => startTask(task.id, task.version).then(refetch) },
                    {
                      label: "Snooze 1d",
                      onClick: () => snoozeTask(task.id, task.version, Date.now() + ONE_DAY_MS).then(refetch),
                    },
                  ]}
                />
              ))}
            </>
          )}
        </div>
      </Section>

      <Section title="Quota Summary">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label="Completed" value={quota?.completedMinutes ?? 0} />
          <Stat label="Scheduled" value={quota?.scheduledMinutes ?? 0} />
          <Stat label="Target" value={quota?.targetMinutes ?? 0} />
          <Stat label="Remaining" value={quota?.remainingMinutes ?? 0} />
        </div>
        <QuotaTargetEditor targetMinutes={quota?.targetMinutes ?? 0} />
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-900 p-2">
      <p className="text-slate-500">{label}</p>
      <p className="text-slate-200">{value}m</p>
    </div>
  );
}

function QuotaTargetEditor({ targetMinutes }: { targetMinutes: number }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(targetMinutes));

  const save = async () => {
    const minutes = Number(value);
    if (!Number.isFinite(minutes) || minutes < 0) return;

    const quotas = await fetchQuotas();
    const existing = quotas.find((q) => q.scopeType === "global" && q.period === "daily");
    if (existing) {
      await updateQuota(existing.id, { targetMinutes: minutes });
    } else {
      await createQuota({ scopeType: "global", period: "daily", targetMinutes: minutes });
    }
    setEditing(false);
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  if (!editing) {
    return (
      <button className="mt-2 text-[11px] text-slate-500 hover:text-slate-300" onClick={() => setEditing(true)}>
        Edit daily target
      </button>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="input w-20 py-1 text-xs"
      />
      <span className="text-xs text-slate-500">min/day</span>
      <button className="btn-secondary px-2 py-1 text-xs" onClick={() => void save()}>
        Save
      </button>
      <button className="text-xs text-slate-500 hover:text-slate-300" onClick={() => setEditing(false)}>
        Cancel
      </button>
    </div>
  );
}
