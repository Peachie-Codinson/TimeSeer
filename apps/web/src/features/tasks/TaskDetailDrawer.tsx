import { useState } from "react";
import { Modal } from "../../components/Modal";
import type { Area } from "../areas/api";
import { fromLocalInputValue, toLocalInputValue } from "../calendar/dateUtils";
import {
  blockTask,
  reopenTask,
  resolveTask,
  returnToActive,
  snoozeTask,
  startTask,
  unblockTask,
  updateTask,
} from "./api";
import type { Task, TaskInput } from "./types";

function dateField(ms: number | null) {
  return ms === null ? "" : toLocalInputValue(ms);
}

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
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [areaId, setAreaId] = useState(task.areaId ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [hardDeadline, setHardDeadline] = useState(dateField(task.hardDeadline));
  const [softDeadline, setSoftDeadline] = useState(dateField(task.softDeadline));
  const [estimatedMinutes, setEstimatedMinutes] = useState(task.estimatedMinutes?.toString() ?? "");
  const [sessionMinutes, setSessionMinutes] = useState(task.sessionMinutes?.toString() ?? "");
  const [snoozeUntil, setSnoozeUntil] = useState(dateField(task.earliestStart));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(task.version);

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

  const handleSave = () =>
    runAction(() => {
      const patch: Partial<TaskInput> & { expectedVersion: number } = {
        title: title.trim() || "Untitled task",
        description: description.trim() || undefined,
        areaId: areaId || undefined,
        priority,
        hardDeadline: hardDeadline ? fromLocalInputValue(hardDeadline) : undefined,
        softDeadline: softDeadline ? fromLocalInputValue(softDeadline) : undefined,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
        sessionMinutes: sessionMinutes ? Number(sessionMinutes) : undefined,
        expectedVersion: version,
      };
      return updateTask(task.id, patch);
    });

  return (
    <Modal title={`#${task.issueNumber} ${task.state === "resolved" ? "(resolved)" : ""}`} onClose={onClose} wide>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Title" />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="input"
          placeholder="Description"
        />

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-slate-400">
            Area
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="input mt-1">
              <option value="">None</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Priority
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="input mt-1"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-slate-400">
            Hard deadline
            <input
              type="datetime-local"
              value={hardDeadline}
              onChange={(e) => setHardDeadline(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Soft deadline
            <input
              type="datetime-local"
              value={softDeadline}
              onChange={(e) => setSoftDeadline(e.target.value)}
              className="input mt-1"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-slate-400">
            Estimated minutes
            <input
              type="number"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Session minutes
            <input
              type="number"
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(e.target.value)}
              className="input mt-1"
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
          <div className="flex flex-wrap gap-2">
            {task.state === "active" && (
              <button disabled={saving} className="btn-secondary" onClick={() => runAction(() => startTask(task.id, version))}>
                Start
              </button>
            )}
            {task.state === "in_progress" && (
              <>
                <button disabled={saving} className="btn-secondary" onClick={() => runAction(() => resolveTask(task.id, version))}>
                  Resolve
                </button>
                <button
                  disabled={saving}
                  className="btn-secondary"
                  onClick={() => runAction(() => returnToActive(task.id, version))}
                >
                  Return to Active
                </button>
              </>
            )}
            {task.state === "active" && (
              <button disabled={saving} className="btn-secondary" onClick={() => runAction(() => resolveTask(task.id, version))}>
                Resolve
              </button>
            )}
            {task.state === "resolved" && (
              <button disabled={saving} className="btn-secondary" onClick={() => runAction(() => reopenTask(task.id, version))}>
                Reopen
              </button>
            )}
            {task.blockedReason ? (
              <button disabled={saving} className="btn-secondary" onClick={() => runAction(() => unblockTask(task.id, version))}>
                Unblock
              </button>
            ) : (
              task.state !== "resolved" && (
                <button
                  disabled={saving}
                  className="btn-secondary"
                  onClick={() => {
                    const reason = window.prompt("Why is this task blocked?");
                    if (reason) void runAction(() => blockTask(task.id, version, reason));
                  }}
                >
                  Block
                </button>
              )
            )}
          </div>
          <button disabled={saving} className="btn-primary w-auto px-4 py-1.5" onClick={handleSave}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        {task.state !== "resolved" && (
          <div className="flex items-end gap-2 border-t border-slate-800 pt-3">
            <label className="block flex-1 text-xs text-slate-400">
              Snooze until
              <input
                type="datetime-local"
                value={snoozeUntil}
                onChange={(e) => setSnoozeUntil(e.target.value)}
                className="input mt-1"
              />
            </label>
            <button
              disabled={saving || !snoozeUntil}
              className="btn-secondary"
              onClick={() => runAction(() => snoozeTask(task.id, version, fromLocalInputValue(snoozeUntil)))}
            >
              Snooze
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
