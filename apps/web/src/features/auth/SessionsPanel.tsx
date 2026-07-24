import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSessions, revokeOtherSessions, revokeSession } from "./api";

export function SessionsPanel() {
  const queryClient = useQueryClient();
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: fetchSessions,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });

  if (isLoading) return <p className="text-sm text-slate-500">Loading sessions...</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-300">Devices</h2>
        <button
          className="btn-secondary"
          onClick={async () => {
            await revokeOtherSessions();
            refresh();
          }}
        >
          Sign out other devices
        </button>
      </div>
      <ul className="divide-y divide-slate-800 rounded-md border border-slate-800">
        {sessions?.map((session) => (
          <li key={session.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <div>
              <p className="text-slate-200">
                {session.deviceName ?? session.userAgent ?? "Unknown device"}
                {session.isCurrent && <span className="ml-2 text-xs text-emerald-400">this device</span>}
              </p>
              <p className="text-xs text-slate-500">
                Last active {new Date(session.lastSeenAt).toLocaleString()}
              </p>
            </div>
            {!session.isCurrent && (
              <button
                className="btn-secondary"
                onClick={async () => {
                  await revokeSession(session.id);
                  refresh();
                }}
              >
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
