import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppSidebar } from "../../components/AppSidebar";
import { formatDuration, formatFullDate } from "../../lib/format";
import "../../styles/nocturne.css";
import { fetchAreas } from "../areas/api";
import {
  type ArchivedTask,
  fetchArchive,
  fetchLatestWeeklyFlushBatch,
  permanentlyDeleteTask,
  restoreArchivedTask,
} from "./api";

type Toast = { message: string; undo?: () => void };

function timeSpentMinutes(task: ArchivedTask): number | null {
  if (task.estimatedMinutes === null) return null;
  if (task.remainingMinutes === null) return task.estimatedMinutes;
  return Math.max(0, task.estimatedMinutes - task.remainingMinutes);
}

export function ArchivePage() {
  const queryClient = useQueryClient();
  const { data: archived = [] } = useQuery({ queryKey: ["archive"], queryFn: fetchArchive });
  const { data: areas = [] } = useQuery({ queryKey: ["areas"], queryFn: fetchAreas });
  const { data: latestBatch } = useQuery({ queryKey: ["archive", "latest-batch"], queryFn: fetchLatestWeeklyFlushBatch });

  const [filterArea, setFilterArea] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [batchDrawerOpen, setBatchDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ArchivedTask | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const areaById = new Map(areas.map((a) => [a.id, a]));

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["archive"] });
    queryClient.invalidateQueries({ queryKey: ["board"] });
  };

  const showToast = (t: Toast) => {
    setToast(t);
    setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 4000);
  };

  const reopen = async (task: ArchivedTask) => {
    await restoreArchivedTask(task.id);
    refetch();
    showToast({
      message: `Reopened "${task.title}"`,
      undo: async () => {
        // "Undo" a reopen by moving the task straight back to resolved (its state before reopening).
        const fresh = await fetch(`/api/v1/tasks/${task.id}`).then((r) => r.json());
        await fetch(`/api/v1/tasks/${task.id}/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedVersion: fresh.version }),
        });
        refetch();
      },
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await permanentlyDeleteTask(deleteTarget.id);
    setDeleteTarget(null);
    refetch();
    showToast({ message: "Task permanently deleted" });
  };

  const filtered = archived.filter(
    (t) => (filterArea === "all" || t.areaId === filterArea) && (filterSource === "all" || t.source === filterSource),
  );

  return (
    <div className="nc-shell" style={{ height: "100vh", width: "100vw", display: "flex", overflow: "hidden" }}>
      <AppSidebar />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div
          style={{
            height: "auto",
            minHeight: 52,
            flex: "none",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "var(--space-4)",
            rowGap: 6,
            borderBottom: "1px solid var(--color-divider)",
            padding: "8px var(--space-6)",
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 15 }}>Archive</div>
          <div
            style={{
              marginLeft: "auto",
              fontSize: 12,
              color: "color-mix(in srgb, var(--color-text) 55%, transparent)",
            }}
          >
            {archived.length} archived task{archived.length === 1 ? "" : "s"}
          </div>
        </div>

        <div
          style={{
            flex: "none",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-4) var(--space-6)",
            borderBottom: "1px solid var(--color-divider)",
            flexWrap: "wrap",
            rowGap: 8,
          }}
        >
          <select className="nc-input" style={{ width: 170 }} value={filterArea} onChange={(e) => setFilterArea(e.target.value)}>
            <option value="all">All areas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select className="nc-input" style={{ width: 170 }} value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            <option value="all">Any source</option>
            <option value="manual">Manual resolve</option>
            <option value="weekly_flush">Weekly flush</option>
          </select>
          {latestBatch && (
            <div style={{ marginLeft: "auto" }}>
              <button type="button" className="nc-btn nc-btn-secondary" onClick={() => setBatchDrawerOpen(true)}>
                <ClockCounterClockwiseIcon size={16} />
                Weekly flush · {formatFullDate(latestBatch.createdAt)}
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "var(--space-6)" }}>
          <table className="nc-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Task</th>
                <th>Area</th>
                <th>Resolved</th>
                <th>Archived</th>
                <th>Time spent</th>
                <th>Source</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const area = task.areaId ? areaById.get(task.areaId) : undefined;
                const spent = timeSpentMinutes(task);
                return (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td>{area?.name ?? "—"}</td>
                    <td>{task.resolvedAt ? formatFullDate(task.resolvedAt) : "—"}</td>
                    <td>{task.archivedAt ? formatFullDate(task.archivedAt) : "—"}</td>
                    <td>{spent !== null ? formatDuration(spent) : "—"}</td>
                    <td>
                      <div className="nc-tag nc-tag-neutral">{task.source === "weekly_flush" ? "Weekly flush" : "Manual"}</div>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button type="button" className="nc-btn nc-btn-secondary" onClick={() => void reopen(task)}>
                        Reopen
                      </button>{" "}
                      <button
                        type="button"
                        className="nc-btn nc-btn-secondary"
                        style={{ color: "var(--color-accent-300)" }}
                        onClick={() => setDeleteTarget(task)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div
              style={{
                padding: "40px 4px",
                textAlign: "center",
                color: "color-mix(in srgb, var(--color-text) 45%, transparent)",
                fontSize: 13,
              }}
            >
              No archived tasks match these filters.
            </div>
          )}
        </div>
      </div>

      {batchDrawerOpen && latestBatch && (
        <div className="nc-drawer-backdrop" onClick={() => setBatchDrawerOpen(false)}>
          <div className="nc-drawer nc-elev-lg" onClick={(e) => e.stopPropagation()}>
            <div className="nc-card-title" style={{ fontSize: 16, marginBottom: 4 }}>
              Weekly flush
            </div>
            <div className="nc-card-meta" style={{ marginBottom: 20 }}>
              {formatFullDate(latestBatch.createdAt)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div className="nc-card-meta">Trigger</div>
                <div style={{ fontSize: 13.5 }}>Scheduled weekly archive</div>
              </div>
              <div>
                <div className="nc-card-meta">Tasks archived</div>
                <div style={{ fontSize: 13.5 }}>{latestBatch.taskCount}</div>
              </div>
              <div>
                <div className="nc-card-meta">Failed tasks</div>
                {/* The flush runs as a single transaction, so it either archives every
                    eligible task in the batch or none — there's no partial-failure state. */}
                <div style={{ fontSize: 13.5 }}>0</div>
              </div>
            </div>
            <button
              type="button"
              className="nc-btn nc-btn-secondary"
              style={{ marginTop: 24, width: "100%" }}
              onClick={() => setBatchDrawerOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="nc-dialog-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="nc-dialog nc-elev-lg" onClick={(e) => e.stopPropagation()}>
            <div className="nc-dialog-title">Permanently delete task?</div>
            <div style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 8 }}>
              "{deleteTarget.title}" will be permanently removed. This cannot be undone.
            </div>
            <div className="nc-dialog-actions">
              <button type="button" className="nc-btn nc-btn-secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="nc-btn nc-btn-primary"
                style={{ color: "var(--color-accent-300)" }}
                onClick={() => void confirmDelete()}
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="nc-card nc-elev-lg nc-toast"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "12px 16px",
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            zIndex: 60,
          }}
        >
          <div style={{ fontSize: 13 }}>{toast.message}</div>
          {toast.undo && (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                toast.undo?.();
                setToast(null);
              }}
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              Undo
            </a>
          )}
        </div>
      )}
    </div>
  );
}
