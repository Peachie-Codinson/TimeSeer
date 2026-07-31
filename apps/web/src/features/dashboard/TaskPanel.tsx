import { Draggable } from "@fullcalendar/interaction";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createQuota, fetchQuotas, updateQuota } from "../quotas/api";
import { PanelTaskCard } from "../tasks/PanelTaskCard";
import { returnToActive, snoozeTask, startTask } from "../tasks/api";
import type { Task } from "../tasks/types";
import "../../styles/nocturne.css";
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
    <div style={{ borderBottom: "1px solid var(--color-divider)", padding: "var(--space-4)" }}>
      <div
        style={{
          marginBottom: 8,
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "color-mix(in srgb, var(--color-text) 55%, transparent)",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>{children}</div>;
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
    <div className="nc-shell" style={{ display: "flex", height: "100%", flexDirection: "column", overflowY: "auto" }}>
      <Section title="Now">
        {now.length === 0 ? (
          <Empty>Nothing happening right now.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {now.map((task) => (
              <PanelTaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </Section>

      <Section title="In Progress">
        {inProgress.length === 0 ? (
          <Empty>No tasks in progress.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {inProgress.map((task) => (
              <PanelTaskCard
                key={task.id}
                task={task}
                actions={[{ label: "Return to Active", onClick: () => returnToActive(task.id, task.version).then(refetch) }]}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Urgent & Time-Gated">
        {urgent.length === 0 ? (
          <Empty>Nothing urgent.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {urgent.map((task) => (
              <PanelTaskCard
                key={task.id}
                task={task}
                actions={task.state === "active" ? [{ label: "Start", onClick: () => startTask(task.id, task.version).then(refetch) }] : undefined}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Active Next">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }} ref={draggableContainerRef}>
          {activeNext.length === 0 ? (
            <Empty>Nothing queued. Add a task from the board.</Empty>
          ) : (
            <>
              <div style={{ fontSize: 11, color: "color-mix(in srgb, var(--color-text) 40%, transparent)" }}>
                Drag a card onto the calendar to schedule it.
              </div>
              {activeNext.map((task) => (
                <PanelTaskCard
                  key={task.id}
                  task={task}
                  draggable
                  actions={[
                    { label: "Start", onClick: () => startTask(task.id, task.version).then(refetch) },
                    { label: "Snooze 1d", onClick: () => snoozeTask(task.id, task.version, Date.now() + ONE_DAY_MS).then(refetch) },
                  ]}
                />
              ))}
            </>
          )}
        </div>
      </Section>

      <Section title="Quota Summary">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
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
    <div style={{ borderRadius: "var(--radius-md)", background: "var(--color-neutral-900)", padding: 8 }}>
      <div style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>{label}</div>
      <div>{value}m</div>
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
      <button
        type="button"
        style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}
        onClick={() => setEditing(true)}
      >
        Edit daily target
      </button>
    );
  }

  return (
    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
      <input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="nc-input" style={{ width: 80, fontSize: 12 }} />
      <span style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>min/day</span>
      <button type="button" className="nc-btn nc-btn-secondary" style={{ fontSize: 12, padding: "4px 8px" }} onClick={() => void save()}>
        Save
      </button>
      <button
        type="button"
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}
        onClick={() => setEditing(false)}
      >
        Cancel
      </button>
    </div>
  );
}
