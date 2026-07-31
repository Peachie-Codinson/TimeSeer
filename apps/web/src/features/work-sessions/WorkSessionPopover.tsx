import { Modal } from "../../components/Modal";
import { completeWorkSession, partialWorkSession, skipWorkSession, startWorkSession } from "./api";
import type { WorkSession } from "./api";

const STATUS_LABEL: Record<WorkSession["status"], string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  partial: "Partially completed",
  skipped: "Skipped",
  cancelled: "Cancelled",
};

export function WorkSessionPopover({
  session,
  taskTitle,
  onClose,
  onChanged,
}: {
  session: WorkSession;
  taskTitle: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const run = async (fn: () => Promise<WorkSession>) => {
    await fn();
    onChanged();
  };

  return (
    <Modal title={taskTitle} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5 }}>
        <div>{STATUS_LABEL[session.status]}</div>
        <div className="nc-card-meta">
          {new Date(session.startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} –{" "}
          {new Date(session.endsAt).toLocaleTimeString(undefined, { timeStyle: "short" })} ({session.plannedMinutes} min planned)
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, borderTop: "1px solid var(--color-divider)", paddingTop: 10 }}>
          {session.status === "planned" && (
            <>
              <button type="button" className="nc-btn nc-btn-secondary" onClick={() => void run(() => startWorkSession(session.id, session.version))}>
                Start
              </button>
              <button type="button" className="nc-btn nc-btn-secondary" onClick={() => void run(() => skipWorkSession(session.id, session.version))}>
                Skip
              </button>
            </>
          )}
          {session.status === "in_progress" && (
            <>
              <button
                type="button"
                className="nc-btn nc-btn-secondary"
                onClick={() => void run(() => completeWorkSession(session.id, session.version))}
              >
                Complete
              </button>
              <button
                type="button"
                className="nc-btn nc-btn-secondary"
                onClick={() => {
                  const input = window.prompt("Minutes actually worked?", String(session.plannedMinutes));
                  const minutes = input === null ? null : Number(input);
                  if (minutes !== null && Number.isFinite(minutes) && minutes >= 0) {
                    void run(() => partialWorkSession(session.id, session.version, minutes));
                  }
                }}
              >
                Partial
              </button>
              <button type="button" className="nc-btn nc-btn-secondary" onClick={() => void run(() => skipWorkSession(session.id, session.version))}>
                Skip
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
