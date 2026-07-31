import { DotsThreeIcon, PlusIcon, TimerIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import "../../styles/nocturne.css";
import type { Area } from "../areas/api";
import { fromLocalInputValue, toLocalInputValue } from "../calendar/dateUtils";
import { createWorkSession } from "../work-sessions/api";
import {
  blockTask,
  fetchTaskActivity,
  fetchTaskSessions,
  reopenTask,
  resolveTask,
  returnToActive,
  snoozeTask,
  startTask,
  unblockTask,
  updateTask,
} from "./api";
import type { SchedulingMode, Task, TaskInput, TaskState } from "./types";

function dateField(ms: number | null) {
  return ms === null ? "" : toLocalInputValue(ms);
}

const STATE_LABEL: Record<TaskState, string> = { active: "Active", in_progress: "In Progress", resolved: "Resolved", archived: "Archived" };
const STATE_TAG_CLASS: Record<TaskState, string> = {
  active: "nc-tag-outline",
  in_progress: "nc-tag-accent",
  resolved: "nc-tag-neutral",
  archived: "nc-tag-neutral",
};
const PRIMARY_ACTION: Record<TaskState, string> = { active: "Start", in_progress: "Resolve", resolved: "Reopen", archived: "Reopen" };
const TABS = ["Overview", "Planning", "Calendar", "Activity"] as const;
type Tab = (typeof TABS)[number];

const ACTIVITY_LABEL: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  moved: "Moved",
  started: "Started",
  returned_to_active: "Returned to Active",
  resolved: "Resolved",
  reopened: "Reopened",
  snoozed: "Snoozed",
  blocked: "Blocked",
  unblocked: "Unblocked",
};

export function TaskDetailDrawer({
  task,
  areas,
  onClose,
  onChanged,
}: {
  task: Task;
  areas: Area[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("Overview");
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [version, setVersion] = useState(task.version);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [areaId, setAreaId] = useState(task.areaId ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [earliestStart, setEarliestStart] = useState(dateField(task.earliestStart));
  const [preferredStart, setPreferredStart] = useState(dateField(task.preferredStart));
  const [preferredEnd, setPreferredEnd] = useState(dateField(task.preferredEnd));
  const [softDeadline, setSoftDeadline] = useState(dateField(task.softDeadline));
  const [hardDeadline, setHardDeadline] = useState(dateField(task.hardDeadline));
  const [estimatedMinutes, setEstimatedMinutes] = useState(task.estimatedMinutes?.toString() ?? "");
  const [remainingMinutes, setRemainingMinutes] = useState(task.remainingMinutes?.toString() ?? "");
  const [sessionMinutes, setSessionMinutes] = useState(task.sessionMinutes?.toString() ?? "");
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>(task.schedulingMode);
  const [snoozeUntil, setSnoozeUntil] = useState(dateField(task.earliestStart));

  const [addingSession, setAddingSession] = useState(false);
  const [sessionStart, setSessionStart] = useState(toLocalInputValue(Date.now()));
  const [sessionEnd, setSessionEnd] = useState(toLocalInputValue(Date.now() + 60 * 60 * 1000));

  const { data: sessions = [] } = useQuery({
    queryKey: ["tasks", task.id, "sessions"],
    queryFn: () => fetchTaskSessions(task.id),
    enabled: tab === "Calendar",
  });
  const { data: activity = [] } = useQuery({
    queryKey: ["tasks", task.id, "activity"],
    queryFn: () => fetchTaskActivity(task.id),
    enabled: tab === "Activity",
  });

  const area = areaId ? areas.find((a) => a.id === areaId) : undefined;

  const runAction = async (fn: () => Promise<Task>) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await fn();
      setVersion(updated.version);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const primaryAction = () => {
    if (task.state === "active") return runAction(() => startTask(task.id, version));
    if (task.state === "in_progress") return runAction(() => resolveTask(task.id, version));
    return runAction(() => reopenTask(task.id, version));
  };

  const saveOverview = () =>
    runAction(() => updateTask(task.id, { description: description.trim() || undefined, expectedVersion: version }));

  const savePlanning = () => {
    const patch: Partial<TaskInput> & { expectedVersion: number } = {
      title: title.trim() || "Untitled task",
      areaId: areaId || undefined,
      priority,
      earliestStart: earliestStart ? fromLocalInputValue(earliestStart) : undefined,
      preferredStart: preferredStart ? fromLocalInputValue(preferredStart) : undefined,
      preferredEnd: preferredEnd ? fromLocalInputValue(preferredEnd) : undefined,
      softDeadline: softDeadline ? fromLocalInputValue(softDeadline) : undefined,
      hardDeadline: hardDeadline ? fromLocalInputValue(hardDeadline) : undefined,
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
      remainingMinutes: remainingMinutes ? Number(remainingMinutes) : undefined,
      sessionMinutes: sessionMinutes ? Number(sessionMinutes) : undefined,
      schedulingMode,
      expectedVersion: version,
    };
    return runAction(() => updateTask(task.id, patch));
  };

  const addSession = async () => {
    await createWorkSession({ taskId: task.id, startsAt: fromLocalInputValue(sessionStart), endsAt: fromLocalInputValue(sessionEnd) });
    setAddingSession(false);
    queryClient.invalidateQueries({ queryKey: ["tasks", task.id, "sessions"] });
  };

  const overflowItems: { label: string; onClick: () => void }[] = [];
  if (task.state === "active") {
    overflowItems.push({ label: "Resolve", onClick: () => void runAction(() => resolveTask(task.id, version)) });
    if (snoozeUntil) overflowItems.push({ label: "Snooze", onClick: () => void runAction(() => snoozeTask(task.id, version, fromLocalInputValue(snoozeUntil))) });
  }
  if (task.state === "in_progress") {
    overflowItems.push({ label: "Return to Active", onClick: () => void runAction(() => returnToActive(task.id, version)) });
  }
  if (task.blockedReason) {
    overflowItems.push({ label: "Unblock", onClick: () => void runAction(() => unblockTask(task.id, version)) });
  } else if (task.state !== "resolved") {
    overflowItems.push({
      label: "Block",
      onClick: () => {
        const reason = window.prompt("Why is this task blocked?");
        if (reason) void runAction(() => blockTask(task.id, version, reason));
      },
    });
  }

  return (
    <div
      className="nc-shell"
      style={{ position: "fixed", inset: 0, display: "flex", zIndex: 40, background: "color-mix(in srgb, var(--color-neutral-900) 55%, transparent)" }}
      onClick={onClose}
    >
      <div style={{ flex: 1 }} />
      <div
        className="nc-card nc-elev-lg"
        style={{ width: 420, flex: "none", borderRadius: 0, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ flex: "none", padding: "var(--space-4) var(--space-4) var(--space-3)", borderBottom: "1px solid var(--color-divider)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="nc-card-kicker">
              #{task.issueNumber} · {area?.name ?? "No area"}
            </div>
            <div className={`nc-tag ${STATE_TAG_CLASS[task.state]}`} style={{ marginLeft: "auto" }}>
              {STATE_LABEL[task.state]}
            </div>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="nc-btn nc-hover"
                style={{ width: 32, padding: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setOverflowOpen((v) => !v);
                }}
              >
                <DotsThreeIcon size={16} />
              </button>
              {overflowOpen && overflowItems.length > 0 && (
                <div
                  className="nc-card nc-elev-md"
                  style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, padding: 4, minWidth: 160, zIndex: 10 }}
                >
                  {overflowItems.map((item) => (
                    <div
                      key={item.label}
                      className="nc-hover"
                      style={{ padding: "8px 10px", fontSize: 12, cursor: "pointer", borderRadius: "var(--radius-sm)", whiteSpace: "nowrap" }}
                      onClick={() => {
                        setOverflowOpen(false);
                        item.onClick();
                      }}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <input
            className="nc-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== task.title && void savePlanning()}
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 500,
              fontSize: 18,
              margin: "8px 0 12px",
              border: "none",
              background: "transparent",
              padding: 0,
            }}
          />
          <button type="button" className="nc-btn nc-btn-primary" style={{ width: "100%" }} disabled={saving} onClick={() => void primaryAction()}>
            {PRIMARY_ACTION[task.state]}
          </button>
        </div>

        <div style={{ flex: "none", display: "flex", borderBottom: "1px solid var(--color-divider)" }}>
          {TABS.map((t) => (
            <div
              key={t}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "10px 4px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                color: tab === t ? "var(--color-accent)" : "var(--color-text)",
                borderBottom: `2px solid ${tab === t ? "var(--color-accent)" : "transparent"}`,
              }}
              onClick={() => setTab(t)}
            >
              {t}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-4)" }}>
          {error && <div style={{ fontSize: 12, color: "var(--color-accent-300)", marginBottom: 12 }}>{error}</div>}

          {tab === "Overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div className="nc-card-kicker" style={{ marginBottom: 6 }}>
                  Description
                </div>
                <textarea
                  className="nc-input"
                  style={{ minHeight: 90 }}
                  placeholder="Add a description…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <button type="button" className="nc-btn nc-btn-primary" disabled={saving} onClick={() => void saveOverview()}>
                Save
              </button>
            </div>
          )}

          {tab === "Planning" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div className="nc-field" style={{ flex: 1 }}>
                  <label>Area</label>
                  <select className="nc-input" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                    <option value="">None</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="nc-field" style={{ width: 90 }}>
                  <label>Priority</label>
                  <input className="nc-input" type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
                </div>
              </div>
              <div className="nc-field">
                <label>Earliest start</label>
                <input className="nc-input" type="datetime-local" value={earliestStart} onChange={(e) => setEarliestStart(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div className="nc-field" style={{ flex: 1 }}>
                  <label>Preferred window start</label>
                  <input className="nc-input" type="datetime-local" value={preferredStart} onChange={(e) => setPreferredStart(e.target.value)} />
                </div>
                <div className="nc-field" style={{ flex: 1 }}>
                  <label>Preferred window end</label>
                  <input className="nc-input" type="datetime-local" value={preferredEnd} onChange={(e) => setPreferredEnd(e.target.value)} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div className="nc-field" style={{ flex: 1 }}>
                  <label>Soft deadline</label>
                  <input className="nc-input" type="datetime-local" value={softDeadline} onChange={(e) => setSoftDeadline(e.target.value)} />
                </div>
                <div className="nc-field" style={{ flex: 1 }}>
                  <label>Hard deadline</label>
                  <input className="nc-input" type="datetime-local" value={hardDeadline} onChange={(e) => setHardDeadline(e.target.value)} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div className="nc-field" style={{ flex: 1 }}>
                  <label>Estimated minutes</label>
                  <input className="nc-input" type="number" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} />
                </div>
                <div className="nc-field" style={{ flex: 1 }}>
                  <label>Remaining minutes</label>
                  <input className="nc-input" type="number" value={remainingMinutes} onChange={(e) => setRemainingMinutes(e.target.value)} />
                </div>
              </div>
              <div className="nc-field">
                <label>Session duration (min)</label>
                <input className="nc-input" type="number" value={sessionMinutes} onChange={(e) => setSessionMinutes(e.target.value)} />
              </div>
              <div className="nc-field">
                <label>Scheduling mode</label>
                <div className="nc-seg">
                  {(["manual", "suggested", "automatic"] as SchedulingMode[]).map((m) => (
                    <label key={m} className="nc-seg-opt" style={schedulingMode === m ? { color: "var(--color-accent)" } : undefined}>
                      <input type="radio" name="sm" checked={schedulingMode === m} onChange={() => setSchedulingMode(m)} />
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <button type="button" className="nc-btn nc-btn-primary" disabled={saving} onClick={() => void savePlanning()}>
                Save
              </button>

              {task.state !== "resolved" && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", borderTop: "1px solid var(--color-divider)", paddingTop: 14 }}>
                  <div className="nc-field" style={{ flex: 1 }}>
                    <label>Snooze until</label>
                    <input className="nc-input" type="datetime-local" value={snoozeUntil} onChange={(e) => setSnoozeUntil(e.target.value)} />
                  </div>
                  <button
                    type="button"
                    className="nc-btn nc-btn-secondary"
                    disabled={saving || !snoozeUntil}
                    onClick={() => void runAction(() => snoozeTask(task.id, version, fromLocalInputValue(snoozeUntil)))}
                  >
                    Snooze
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "Calendar" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sessions.map((s) => (
                <div key={s.id} className="nc-card" style={{ padding: "var(--space-3)", display: "flex", alignItems: "center", gap: 10 }}>
                  <TimerIcon size={16} style={{ color: "var(--color-accent)" }} />
                  <div>
                    <div style={{ fontSize: 13 }}>{new Date(s.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                    <div className="nc-card-meta">
                      {new Date(s.startsAt).toLocaleTimeString(undefined, { timeStyle: "short" })} –{" "}
                      {new Date(s.endsAt).toLocaleTimeString(undefined, { timeStyle: "short" })} · {s.status}
                    </div>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && <div className="nc-card-meta">No scheduled sessions.</div>}

              {addingSession ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="nc-input" type="datetime-local" value={sessionStart} onChange={(e) => setSessionStart(e.target.value)} />
                    <input className="nc-input" type="datetime-local" value={sessionEnd} onChange={(e) => setSessionEnd(e.target.value)} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="nc-btn nc-btn-primary" style={{ flex: 1 }} onClick={() => void addSession()}>
                      Save session
                    </button>
                    <button type="button" className="nc-btn nc-btn-secondary" style={{ flex: 1 }} onClick={() => setAddingSession(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="nc-btn nc-btn-secondary" style={{ width: "100%" }} onClick={() => setAddingSession(true)}>
                  <PlusIcon size={15} />
                  Add session
                </button>
              )}
              <Link to="/" style={{ fontSize: 12.5 }}>
                View in calendar →
              </Link>
            </div>
          )}

          {tab === "Activity" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {activity.map((ev) => (
                <div key={ev.id} style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-accent)", marginTop: 6, flex: "none" }} />
                  <div>
                    <div style={{ fontSize: 13 }}>{ACTIVITY_LABEL[ev.action] ?? ev.action}</div>
                    <div className="nc-card-meta">{new Date(ev.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</div>
                  </div>
                </div>
              ))}
              {activity.length === 0 && <div className="nc-card-meta">No activity yet.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
