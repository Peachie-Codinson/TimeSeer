import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../components/Modal";
import { fetchTasks } from "../tasks/api";
import { applySchedule, previewSchedule } from "./api";

export function SchedulePreviewModal({
  rangeStart,
  rangeEnd,
  onClose,
  onApplied,
}: {
  rangeStart: number;
  rangeEnd: number;
  onClose: () => void;
  onApplied: () => void;
}) {
  const { data: result, isLoading } = useQuery({
    queryKey: ["schedule-preview", rangeStart, rangeEnd],
    queryFn: () => previewSchedule(rangeStart, rangeEnd),
  });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const taskTitleById = useMemo(() => new Map(tasks.map((t) => [t.id, t.title])), [tasks]);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (result) setSelected(new Set(result.proposals.map((_, i) => i)));
  }, [result]);

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const label = (id: string) => taskTitleById.get(id) ?? "Unknown task";

  return (
    <Modal title="Suggested schedule" onClose={onClose} wide>
      {isLoading && <p className="text-sm text-slate-500">Calculating...</p>}

      {result && (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {result.proposals.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing to schedule in this range.</p>
          ) : (
            <ul className="space-y-2">
              {result.proposals.map((p, i) => (
                <li key={i} className="flex items-start gap-2 rounded-md border border-slate-800 p-2 text-sm">
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} className="mt-1" />
                  <div>
                    <p className="text-slate-200">{label(p.taskId)}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(p.startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} –{" "}
                      {new Date(p.endsAt).toLocaleTimeString(undefined, { timeStyle: "short" })}
                    </p>
                    <p className="text-xs text-slate-600">{p.explanation}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {result.unscheduled.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Couldn&apos;t schedule
              </h3>
              <ul className="space-y-1 text-xs text-slate-500">
                {result.unscheduled.map((u) => (
                  <li key={u.taskId}>
                    {label(u.taskId)}: {u.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.risks.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-500">Risks</h3>
              <ul className="space-y-1 text-xs text-amber-400">
                {result.risks.map((r) => (
                  <li key={r.taskId}>
                    {label(r.taskId)}: {r.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary w-auto px-4"
              disabled={applying || selected.size === 0}
              onClick={async () => {
                setApplying(true);
                try {
                  await applySchedule(result.proposals.filter((_, i) => selected.has(i)));
                  onApplied();
                } finally {
                  setApplying(false);
                }
              }}
            >
              {applying ? "Applying..." : `Apply ${selected.size} session${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
