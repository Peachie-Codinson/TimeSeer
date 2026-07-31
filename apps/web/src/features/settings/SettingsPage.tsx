import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  changePassword,
  fetchSessions,
  logout,
  revokeOtherSessions,
  revokeSession,
} from "../auth/api";
import { authStatusQueryKey } from "../auth/useAuthStatus";
import { AppSidebar } from "../../components/AppSidebar";
import "../../styles/nocturne.css";

const SECTIONS = ["General", "Task Defaults", "Notifications", "Appearance", "Security", "Data", "Integrations"] as const;
type Section = (typeof SECTIONS)[number];

/** These sections have no backend storage for their settings yet (no `owner_settings` table or
 * equivalent columns) — shown as an honest placeholder rather than controls that don't persist. */
const NOT_YET_BUILT: Partial<Record<Section, string>> = {
  General: "Timezone, start-of-week, time format, default calendar view, and visible hours aren't stored yet.",
  "Task Defaults": "Default session duration, scheduling mode, and archive-timing preferences aren't stored yet.",
  Notifications: "Reminder and quiet-hours preferences aren't stored yet — the notification bell already computes reminders live, just without per-user tuning.",
  Appearance: "There's one theme (Nocturne dark) and no persisted density/motion preferences yet. Each board's own density toggle (e.g. Task Board's Comfortable/Compact) already works independently.",
};

function NotYetBuilt({ note }: { note: string }) {
  return (
    <div
      style={{
        padding: "var(--space-4)",
        border: "1px dashed var(--color-divider)",
        borderRadius: "var(--radius-md)",
        color: "color-mix(in srgb, var(--color-text) 55%, transparent)",
        fontSize: 13,
      }}
    >
      Not yet implemented. {note}
    </div>
  );
}

function SecuritySection() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: sessions = [] } = useQuery({ queryKey: ["auth", "sessions"], queryFn: fetchSessions });
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refreshSessions = () => queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });

  const submitPasswordChange = async () => {
    setError(null);
    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      // Changing the password invalidates every session (including this one) server-side.
      queryClient.setQueryData(authStatusQueryKey, { ownerExists: true, authenticated: false });
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const doLogout = async () => {
    await logout();
    queryClient.setQueryData(authStatusQueryKey, { ownerExists: true, authenticated: false });
    navigate("/login", { replace: true });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!changingPassword ? (
        <button type="button" className="nc-btn nc-btn-secondary" style={{ alignSelf: "flex-start" }} onClick={() => setChangingPassword(true)}>
          Change password
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 }}>
          <div className="nc-field">
            <label>Current password</label>
            <input className="nc-input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="nc-field">
            <label>New password</label>
            <input className="nc-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          {error && <div style={{ fontSize: 12, color: "var(--color-accent-300)" }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="nc-btn nc-btn-primary" disabled={saving} onClick={() => void submitPasswordChange()}>
              Save new password
            </button>
            <button type="button" className="nc-btn nc-btn-secondary" onClick={() => setChangingPassword(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="nc-card" style={{ padding: "var(--space-4)" }}>
        <div className="nc-card-kicker">Device sessions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {sessions.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13.5 }}>{s.deviceName ?? s.userAgent ?? "Unknown device"}</div>
                <div className="nc-card-meta">
                  {s.isCurrent ? "Active now" : `Last active ${new Date(s.lastSeenAt).toLocaleString()}`}
                </div>
              </div>
              {s.isCurrent ? (
                <div className="nc-tag nc-tag-accent">Current</div>
              ) : (
                <button
                  type="button"
                  className="nc-btn nc-btn-secondary"
                  onClick={() => void revokeSession(s.id).then(refreshSessions)}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="nc-btn"
        style={{ alignSelf: "flex-start", color: "var(--color-accent-300)" }}
        onClick={() => void revokeOtherSessions().then(refreshSessions)}
      >
        Revoke other sessions
      </button>
      <button type="button" className="nc-btn" style={{ alignSelf: "flex-start" }} onClick={() => void doLogout()}>
        Logout
      </button>
    </div>
  );
}

function DataSection() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="nc-card-meta">
        Backup, restore, and export run via CLI scripts on the server (see the project README) — there's no
        in-app control for them yet.
      </div>
    </div>
  );
}

function IntegrationsSection() {
  return (
    <div className="nc-card" style={{ padding: "var(--space-4)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>Canvas</div>
        <div className="nc-card-meta">LMS integration</div>
      </div>
      <div className="nc-tag nc-tag-neutral">Coming later</div>
    </div>
  );
}

export function SettingsPage() {
  const [active, setActive] = useState<Section>("General");

  return (
    <div className="nc-shell" style={{ height: "100vh", width: "100vw", display: "flex", overflow: "hidden" }}>
      <AppSidebar />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div
          style={{
            height: 52,
            flex: "none",
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid var(--color-divider)",
            padding: "0 var(--space-6)",
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 15 }}>Settings</div>
        </div>
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ width: 180, flex: "none", borderRight: "1px solid var(--color-divider)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 2 }}>
            {SECTIONS.map((name) => (
              <div
                key={name}
                style={{
                  padding: "7px 10px",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  fontSize: 13,
                  background: active === name ? "color-mix(in srgb, var(--color-accent) 14%, transparent)" : "transparent",
                  color: active === name ? "var(--color-accent)" : "var(--color-text)",
                  fontWeight: active === name ? 600 : 400,
                }}
                onClick={() => setActive(name)}
              >
                {name}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-6)", maxWidth: 560 }}>
            {NOT_YET_BUILT[active] && <NotYetBuilt note={NOT_YET_BUILT[active]!} />}
            {active === "Security" && <SecuritySection />}
            {active === "Data" && <DataSection />}
            {active === "Integrations" && <IntegrationsSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
