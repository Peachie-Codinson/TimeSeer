import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { fetchArchive, flushArchive, flushPreview, permanentlyDeleteTask, restoreArchivedTask } from "./api";

export function ArchivePage() {
  const queryClient = useQueryClient();
  const { data: archived = [] } = useQuery({ queryKey: ["archive"], queryFn: fetchArchive });
  const { data: preview } = useQuery({ queryKey: ["archive", "preview"], queryFn: flushPreview });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["archive"] });
    queryClient.invalidateQueries({ queryKey: ["board"] });
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/tasks" className="text-sm text-slate-400 hover:text-white">
              ← Tasks
            </Link>
            <h1 className="text-lg font-semibold">Archive</h1>
          </div>
          {preview && preview.eligibleCount > 0 && (
            <button
              className="btn-secondary"
              onClick={async () => {
                await flushArchive();
                refetch();
              }}
            >
              Immolate {preview.eligibleCount} eligible task{preview.eligibleCount === 1 ? "" : "s"}
            </button>
          )}
        </div>

        <p className="text-sm text-slate-500">
          Resolved tasks are archived automatically once they&apos;ve sat resolved for a week, or immediately
          via Immolate from the board. Archived tasks can be restored or permanently deleted here.
        </p>

        {archived.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing archived yet.</p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-md border border-slate-800">
            {archived.map((task) => (
              <li key={task.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="text-slate-200">{task.title}</p>
                  <p className="text-xs text-slate-500">#{task.issueNumber}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary"
                    onClick={async () => {
                      await restoreArchivedTask(task.id);
                      refetch();
                    }}
                  >
                    Restore
                  </button>
                  <button
                    className="btn-secondary text-red-400 hover:text-red-300"
                    onClick={async () => {
                      if (!window.confirm(`Permanently delete "${task.title}"? This cannot be undone.`)) return;
                      await permanentlyDeleteTask(task.id);
                      refetch();
                    }}
                  >
                    Delete permanently
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
