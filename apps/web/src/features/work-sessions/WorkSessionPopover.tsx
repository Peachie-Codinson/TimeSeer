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
      <div className="space-y-3 text-sm">
        <p className="text-slate-300">{STATUS_LABEL[session.status]}</p>
        <p className="text-xs text-slate-500">
          {new Date(session.startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} –{" "}
          {new Date(session.endsAt).toLocaleTimeString(undefined, { timeStyle: "short" })} ({session.plannedMinutes}
          min planned)
        </p>

        <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
          {session.status === "planned" && (
            <>
              <button
                className="btn-secondary"
                onClick={() => void run(() => startWorkSession(session.id, session.version))}
              >
                Start
              </button>
              <button
                className="btn-secondary"
                onClick={() => void run(() => skipWorkSession(session.id, session.version))}
              >
                Skip
              </button>
            </>
          )}
          {session.status === "in_progress" && (
            <>
              <button
                className="btn-secondary"
                onClick={() => void run(() => completeWorkSession(session.id, session.version))}
              >
                Complete
              </button>
              <button
                className="btn-secondary"
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
              <button
                className="btn-secondary"
                onClick={() => void run(() => skipWorkSession(session.id, session.version))}
              >
                Skip
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
