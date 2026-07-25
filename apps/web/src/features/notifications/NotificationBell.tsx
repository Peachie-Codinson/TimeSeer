import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { isTauri, sendNativeNotification } from "../../platform/tauri";
import { type Notification as AppNotification, fetchNotifications } from "./api";

const POLL_INTERVAL_MS = 60_000;

const SEVERITY_DOT: Record<AppNotification["severity"], string> = {
  info: "bg-sky-400",
  warning: "bg-amber-400",
  critical: "bg-red-400",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const seenIds = useRef<Set<string> | null>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (seenIds.current === null) {
      // First load: don't fire browser notifications for things that were already true
      // before this tab opened, only for ones that newly appear afterward.
      seenIds.current = new Set(notifications.map((n) => n.id));
      return;
    }

    const fresh = notifications.filter((n) => !seenIds.current!.has(n.id));
    seenIds.current = new Set(notifications.map((n) => n.id));

    for (const n of fresh) {
      void sendNativeNotification("Planner", n.message).then((sentNatively) => {
        if (!sentNatively && typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("Planner", { body: n.message });
        }
      });
    }
  }, [notifications]);

  const requestPermission = () => {
    if (permissionRequested) return;
    setPermissionRequested(true);
    // In Tauri, permission is requested lazily inside sendNativeNotification itself.
    if (!isTauri() && typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  };

  return (
    <div className="relative">
      <button
        className="relative text-xs text-slate-400 hover:text-white"
        onClick={() => {
          setOpen((v) => !v);
          requestPermission();
        }}
        aria-label="Notifications"
      >
        Notifications
        {notifications.length > 0 && (
          <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-72 rounded-md border border-slate-800 bg-slate-900 shadow-xl">
            <div className="max-h-96 overflow-y-auto p-2">
              {notifications.length === 0 ? (
                <p className="p-2 text-xs text-slate-500">Nothing to see right now.</p>
              ) : (
                <ul className="space-y-1">
                  {notifications.map((n) => (
                    <li key={n.id} className="flex items-start gap-2 rounded p-2 text-xs hover:bg-slate-800">
                      <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[n.severity]}`} />
                      <span className="text-slate-300">{n.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
