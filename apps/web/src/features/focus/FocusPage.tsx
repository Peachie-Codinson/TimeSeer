import { ArrowLeftIcon, CheckIcon, EyeSlashIcon, PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { formatDuration } from "../../lib/format";
import "../../styles/nocturne.css";
import { blockTask, resolveTask } from "../tasks/api";
import type { WorkSession } from "../work-sessions/api";
import { completeWorkSession, fetchActiveWorkSession, partialWorkSession } from "../work-sessions/api";
import type { Task } from "../tasks/types";

function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** The running timer + controls once a session is confirmed active — split out so its elapsed-
 * seconds state can be (re)seeded fresh from `session.startsAt` whenever the active session changes. */
function ActiveSession({
  session,
  task,
  distractionFree,
  onToggleDistractionFree,
  onChanged,
}: {
  session: WorkSession;
  task: Task;
  distractionFree: boolean;
  onToggleDistractionFree: () => void;
  onChanged: () => void;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => (Date.now() - session.startsAt) / 1000);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [paused]);

  const plannedSeconds = session.plannedMinutes * 60;
  const remainingSeconds = plannedSeconds - elapsedSeconds;
  const overtime = remainingSeconds < 0;
  const progressPct = Math.min(100, Math.round((elapsedSeconds / plannedSeconds) * 100));
  const elapsedMinutes = Math.max(0, Math.round(elapsedSeconds / 60));

  const finishSession = () => void completeWorkSession(session.id, session.version, elapsedMinutes).then(onChanged);
  const markPartial = () => void partialWorkSession(session.id, session.version, elapsedMinutes).then(onChanged);
  const handleResolveTask = () => void resolveTask(task.id, task.version).then(onChanged);
  const reportBlocker = () => {
    const reason = window.prompt("Why is this task blocked?");
    if (reason) void blockTask(task.id, task.version, reason).then(onChanged);
  };

  return (
    <div style={{ width: 480, maxWidth: "90vw", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {distractionFree && (
        <button
          type="button"
          className="nc-btn nc-btn-secondary"
          style={{ position: "fixed", top: 16, right: 16 }}
          onClick={onToggleDistractionFree}
        >
          Exit minimal mode
        </button>
      )}

      <div style={{ textAlign: "center" }}>
        <div className="nc-card-kicker" style={{ justifyContent: "center", display: "flex" }}>
          #{task.issueNumber}
        </div>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 22, margin: "6px 0" }}>{task.title}</div>
        <div style={{ fontSize: 12.5, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
          Planned {formatDuration(session.plannedMinutes)}
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 56, fontWeight: 500, letterSpacing: "0.02em" }}>
          {fmtClock(Math.abs(remainingSeconds))}
        </div>
        <div style={{ fontSize: 12.5, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginTop: 4 }}>
          {paused ? "paused" : overtime ? "over" : "remaining"}
        </div>
      </div>

      <div style={{ height: 6, borderRadius: 3, background: "var(--color-neutral-800)", overflow: "hidden" }}>
        <div style={{ height: "100%", background: "var(--color-accent)", width: `${progressPct}%`, transition: "width 400ms linear" }} />
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button type="button" className="nc-btn nc-btn-secondary" onClick={() => setPaused((p) => !p)}>
          {paused ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
          {paused ? "Resume" : "Pause"}
        </button>
        <button type="button" className="nc-btn nc-btn-primary" onClick={finishSession}>
          <CheckIcon size={16} />
          Finish Session
        </button>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button type="button" className="nc-btn" style={{ color: "var(--color-accent)" }} onClick={handleResolveTask}>
          Resolve Task
        </button>
        <button type="button" className="nc-btn" style={{ color: "var(--color-accent)" }} onClick={markPartial}>
          Mark Partial
        </button>
        <button type="button" className="nc-btn" style={{ color: "var(--color-accent-300)" }} onClick={reportBlocker}>
          Report Blocker
        </button>
      </div>
    </div>
  );
}

export function FocusPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["work-sessions", "active"], queryFn: fetchActiveWorkSession });
  const [distractionFree, setDistractionFree] = useState(false);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["work-sessions", "active"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  if (isLoading) return null;

  return (
    <div className="nc-shell" style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {!distractionFree && (
        <div
          style={{
            height: 52,
            flex: "none",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
            borderBottom: "1px solid var(--color-divider)",
            padding: "0 var(--space-6)",
          }}
        >
          <Link to="/" className="nc-btn nc-hover" style={{ padding: 0, width: 36, justifyContent: "center" }}>
            <ArrowLeftIcon size={16} />
          </Link>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 15 }}>Focus</div>
          {data && (
            <button type="button" className="nc-btn nc-btn-secondary" style={{ marginLeft: "auto" }} onClick={() => setDistractionFree(true)}>
              <EyeSlashIcon size={16} />
              Minimal mode
            </button>
          )}
        </div>
      )}

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto" }}>
        {data ? (
          <ActiveSession
            key={data.session.id}
            session={data.session}
            task={data.task}
            distractionFree={distractionFree}
            onToggleDistractionFree={() => setDistractionFree(false)}
            onChanged={refetch}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No focus session running</div>
            <div style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Schedule a task on the calendar, then start its work session to begin a focus session here.
            </div>
            <Link to="/" className="nc-btn nc-btn-primary" style={{ marginTop: 8 }}>
              Go to Calendar
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
