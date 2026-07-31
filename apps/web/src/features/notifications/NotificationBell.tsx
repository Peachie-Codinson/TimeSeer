import { BellIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { isTauri, sendNativeNotification } from "../../platform/tauri";
import "../../styles/nocturne.css";
import { type Notification as AppNotification, fetchNotifications } from "./api";

const POLL_INTERVAL_MS = 60_000;

const SEVERITY_COLOR: Record<AppNotification["severity"], string> = {
  info: "var(--color-accent)",
  warning: "#d9a884",
  critical: "var(--color-accent-300)",
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
    <div className="nc-shell" style={{ position: "relative" }}>
      <button
        type="button"
        className="nc-btn nc-hover"
        style={{ position: "relative", width: 32, padding: 0 }}
        onClick={() => {
          setOpen((v) => !v);
          requestPermission();
        }}
        aria-label="Notifications"
      >
        <BellIcon size={16} />
        {notifications.length > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              minWidth: 14,
              height: 14,
              borderRadius: 7,
              background: "var(--color-accent-300)",
              color: "var(--color-bg)",
              fontSize: 9,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
            }}
          >
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 30 }} onClick={() => setOpen(false)} />
          <div className="nc-card nc-elev-lg" style={{ position: "absolute", right: 0, zIndex: 40, marginTop: 8, width: 288, padding: 8 }}>
            <div style={{ maxHeight: 384, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: 8, fontSize: 12, color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>Nothing to see right now.</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="nc-hover" style={{ display: "flex", alignItems: "flex-start", gap: 8, borderRadius: "var(--radius-sm)", padding: 8, fontSize: 12 }}>
                    <span style={{ marginTop: 4, width: 6, height: 6, flex: "none", borderRadius: "50%", background: SEVERITY_COLOR[n.severity] }} />
                    <span>{n.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
