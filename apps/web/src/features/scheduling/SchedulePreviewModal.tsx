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
      {isLoading && <div className="nc-card-meta">Calculating...</div>}

      {result && (
        <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 4, display: "flex", flexDirection: "column", gap: 16 }}>
          {result.proposals.length === 0 ? (
            <div className="nc-card-meta">Nothing to schedule in this range.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {result.proposals.map((p, i) => (
                <div key={i} className="nc-card" style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "var(--space-3)" }}>
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} style={{ marginTop: 4 }} />
                  <div>
                    <div style={{ fontSize: 13.5 }}>{label(p.taskId)}</div>
                    <div className="nc-card-meta">
                      {new Date(p.startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} –{" "}
                      {new Date(p.endsAt).toLocaleTimeString(undefined, { timeStyle: "short" })}
                    </div>
                    <div style={{ fontSize: 11, color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>{p.explanation}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.unscheduled.length > 0 && (
            <div>
              <div className="nc-card-kicker" style={{ marginBottom: 4 }}>
                Couldn&apos;t schedule
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {result.unscheduled.map((u) => (
                  <div key={u.taskId} className="nc-card-meta">
                    {label(u.taskId)}: {u.reason}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.risks.length > 0 && (
            <div>
              <div className="nc-card-kicker" style={{ marginBottom: 4, color: "var(--color-accent-300)" }}>
                Risks
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {result.risks.map((r) => (
                  <div key={r.taskId} style={{ fontSize: 11.5, color: "var(--color-accent-300)" }}>
                    {label(r.taskId)}: {r.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="nc-dialog-actions">
            <button type="button" className="nc-btn nc-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="nc-btn nc-btn-primary"
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
