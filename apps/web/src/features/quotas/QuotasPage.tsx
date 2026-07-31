import {
  ArrowUpIcon,
  CaretDownIcon,
  CaretUpIcon,
  DotsThreeVerticalIcon,
  PencilSimpleIcon,
  PlusIcon,
  SparkleIcon,
  TrashIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import type { ReactNode } from "react";
import { AppSidebar } from "../../components/AppSidebar";
import { formatDuration } from "../../lib/format";
import { paceInfo, scalePct, tierInfo } from "../../lib/quotaTiers";
import "../../styles/nocturne.css";
import { type Area, fetchAreas } from "../areas/api";
import {
  type Quota,
  type QuotaInput,
  type QuotaPeriod,
  type QuotaProgress,
  createQuota,
  deleteQuota,
  fetchQuotaHistory,
  fetchQuotaProgress,
  fetchQuotas,
  updateQuota,
} from "./api";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TIER_ICON: Record<number, ReactNode> = {
  2: <ArrowUpIcon size={13} />,
  3: <SparkleIcon size={13} />,
  4: <TrophyIcon size={13} />,
};

function scopeLabel(quota: Quota, areaById: Map<string, Area>): { label: string; color: string } {
  if (quota.scopeType === "area" && quota.scopeId) {
    const area = areaById.get(quota.scopeId);
    return { label: area?.name ?? "Unknown area", color: area?.color ?? "var(--color-neutral-600)" };
  }
  return { label: "Overall", color: "var(--color-accent)" };
}

function ProgressBar({
  ratio,
  barColor,
  glow,
  height = 6,
  showTicks = true,
}: {
  ratio: number;
  barColor: string;
  glow: string;
  height?: number;
  showTicks?: boolean;
}) {
  const pct = scalePct(ratio);
  return (
    <div
      style={{
        flex: 1,
        height,
        borderRadius: height / 2,
        background: "var(--color-neutral-800)",
        position: "relative",
        boxShadow: glow,
      }}
    >
      <div style={{ height: "100%", borderRadius: height / 2, background: barColor, width: `${pct}%`, transition: "width 400ms ease, background 400ms ease" }} />
      {showTicks && (
        <>
          <div title="Minimum (floor)" style={{ position: "absolute", left: `${scalePct(1)}%`, top: -3, bottom: -3, width: 2, background: "var(--color-text)" }} />
          <div title="+20%" style={{ position: "absolute", left: `${scalePct(1.2)}%`, top: -2, bottom: -2, width: 1, background: ratio >= 1.2 ? barColor : "color-mix(in srgb, var(--color-text) 25%, transparent)" }} />
          <div title="+50%" style={{ position: "absolute", left: `${scalePct(1.5)}%`, top: -2, bottom: -2, width: 1, background: ratio >= 1.5 ? barColor : "color-mix(in srgb, var(--color-text) 25%, transparent)" }} />
          <div title="+100%" style={{ position: "absolute", left: `${scalePct(2)}%`, top: -2, bottom: -2, width: 1, background: ratio >= 2 ? barColor : "color-mix(in srgb, var(--color-text) 25%, transparent)" }} />
        </>
      )}
    </div>
  );
}

function emptyEditorState(defaults?: Partial<Quota>) {
  return {
    scopeValue: defaults?.scopeType === "area" && defaults.scopeId ? defaults.scopeId : "global",
    period: (defaults?.period ?? "daily") as QuotaPeriod,
    weekday: defaults?.weekday !== null && defaults?.weekday !== undefined ? String(defaults.weekday) : "",
    minimum: defaults?.minimumMinutes !== null && defaults?.minimumMinutes !== undefined ? String(defaults.minimumMinutes / 60) : "2",
    target: defaults?.targetMinutes !== null && defaults?.targetMinutes !== undefined ? String(defaults.targetMinutes / 60) : "4",
    maximum: defaults?.maximumMinutes !== null && defaults?.maximumMinutes !== undefined ? String(defaults.maximumMinutes / 60) : "6",
    active: defaults?.active === undefined ? true : !!defaults.active,
  };
}

function HistoryRow({ quotaId, minimumMinutes, targetMinutes }: { quotaId: string; minimumMinutes: number | null; targetMinutes: number | null }) {
  const { data: history = [] } = useQuery({ queryKey: ["quotas", "history", quotaId], queryFn: () => fetchQuotaHistory(quotaId, 6) });
  const floorBasis = minimumMinutes || targetMinutes || 1;

  if (history.length === 0) {
    return <div className="nc-card-meta">No previous periods yet.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {history.map((h) => {
        const ratio = h.completedMinutes / floorBasis;
        const ti = tierInfo(ratio);
        return (
          <div key={h.periodsAgo} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 64, flex: "none", fontSize: 11.5, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              -{h.periodsAgo}
            </div>
            <ProgressBar ratio={ratio} barColor={ti.barColor} glow={ti.tier >= 3 ? ti.glow : "none"} showTicks={false} />
            <div style={{ width: 14, flex: "none", display: "flex", justifyContent: "center", color: ti.barColor }}>
              {ti.tier >= 2 ? TIER_ICON[ti.tier] : null}
            </div>
            <div style={{ width: 48, flex: "none", textAlign: "right", fontSize: 11.5 }}>{Math.round(ratio * 100)}%</div>
          </div>
        );
      })}
    </div>
  );
}

export function QuotasPage() {
  const queryClient = useQueryClient();
  const { data: quotas = [] } = useQuery({ queryKey: ["quotas"], queryFn: fetchQuotas });
  const { data: progress = [] } = useQuery({ queryKey: ["quotas", "progress"], queryFn: fetchQuotaProgress });
  const { data: areas = [] } = useQuery({ queryKey: ["areas"], queryFn: fetchAreas });
  const areaById = new Map(areas.map((a) => [a.id, a]));
  const progressByQuota = new Map<string, QuotaProgress>(progress.map((p) => [p.quotaId, p]));

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState<Quota | null>(null);
  const [editor, setEditor] = useState(emptyEditorState());

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["quotas"] });
  };

  const openNew = () => {
    setEditingQuota(null);
    setEditor(emptyEditorState());
    setEditorOpen(true);
  };
  const openEdit = (q: Quota) => {
    setEditingQuota(q);
    setEditor(emptyEditorState(q));
    setMenuOpenFor(null);
    setEditorOpen(true);
  };
  const closeEditor = () => setEditorOpen(false);

  const saveEditor = async () => {
    const hours = (v: string) => (v.trim() === "" ? undefined : Math.round(Number(v) * 60));
    const input: QuotaInput = {
      scopeType: editor.scopeValue === "global" ? "global" : "area",
      scopeId: editor.scopeValue === "global" ? undefined : editor.scopeValue,
      period: editor.period,
      weekday: editor.period === "daily" && editor.weekday !== "" ? Number(editor.weekday) : undefined,
      minimumMinutes: hours(editor.minimum),
      targetMinutes: hours(editor.target),
      maximumMinutes: hours(editor.maximum),
      active: editor.active,
    };
    if (editingQuota) {
      await updateQuota(editingQuota.id, input);
    } else {
      await createQuota(input);
    }
    setEditorOpen(false);
    refetch();
  };

  const removeQuota = async (id: string) => {
    setMenuOpenFor(null);
    await deleteQuota(id);
    refetch();
  };

  return (
    <div className="nc-shell" style={{ height: "100vh", width: "100vw", display: "flex", overflow: "hidden" }} onClick={() => setMenuOpenFor(null)}>
      <AppSidebar />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div
          style={{
            height: "auto",
            minHeight: 52,
            flex: "none",
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid var(--color-divider)",
            padding: "8px var(--space-6)",
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 15 }}>Quotas</div>
          <button type="button" className="nc-btn nc-btn-primary" style={{ marginLeft: "auto" }} onClick={openNew}>
            <PlusIcon size={16} />
            New Quota
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "var(--space-6)" }}>
          <table className="nc-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Scope</th>
                <th>Period</th>
                <th>Minimum</th>
                <th>Progress</th>
                <th>Remaining</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {quotas.map((q) => {
                const scope = scopeLabel(q, areaById);
                const p = progressByQuota.get(q.id);
                const completedMinutes = p?.completedMinutes ?? 0;
                const plannedMinutes = p?.plannedMinutes ?? 0;
                const floorBasis = q.minimumMinutes || q.targetMinutes || 1;
                const ratio = completedMinutes / floorBasis;
                const ti = tierInfo(ratio);
                const pace = paceInfo(completedMinutes, plannedMinutes);
                const remaining = Math.max(0, (q.targetMinutes ?? 0) - completedMinutes);
                const expanded = expandedId === q.id;

                return (
                  <Fragment key={q.id}>
                    <tr>
                      <td style={{ fontWeight: 500 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: scope.color, flex: "none" }} />
                          {scope.label}
                        </div>
                      </td>
                      <td style={{ textTransform: "capitalize" }}>
                        {q.period}
                        {q.period === "daily" && q.weekday !== null ? ` (${WEEKDAY_NAMES[q.weekday]})` : ""}
                      </td>
                      <td>{q.minimumMinutes !== null ? formatDuration(q.minimumMinutes) : "—"}</td>
                      <td style={{ minWidth: 220 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <ProgressBar ratio={ratio} barColor={ti.barColor} glow={ti.tier >= 3 ? ti.glow : "none"} />
                          <div style={{ width: 16, flex: "none", display: "flex", justifyContent: "center", color: ti.barColor }}>
                            {ti.tier >= 2 ? TIER_ICON[ti.tier] : null}
                          </div>
                          <div style={{ fontSize: 11, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", whiteSpace: "nowrap", width: 40, textAlign: "right" }}>
                            {Math.round(ratio * 100)}%
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          <div className={`nc-tag ${ti.tagClass}`}>{ti.label}</div>
                          <div className={`nc-tag ${pace.tagClass}`}>{pace.label}</div>
                        </div>
                      </td>
                      <td>{formatDuration(remaining)}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap", position: "relative" }}>
                        <button type="button" className="nc-btn" onClick={() => setExpandedId((cur) => (cur === q.id ? null : q.id))}>
                          {expanded ? <CaretUpIcon size={14} /> : <CaretDownIcon size={14} />}
                          History
                        </button>
                        <button
                          type="button"
                          className="nc-btn nc-hover"
                          style={{ width: 32, padding: 0 }}
                          title="More"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenFor((cur) => (cur === q.id ? null : q.id));
                          }}
                        >
                          <DotsThreeVerticalIcon size={16} />
                        </button>
                        {menuOpenFor === q.id && (
                          <div
                            className="nc-card nc-elev-md"
                            style={{ position: "absolute", top: 36, right: 0, zIndex: 10, width: 130, padding: 4, textAlign: "left" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              className="nc-hover"
                              style={{ padding: "8px 10px", fontSize: 12.5, cursor: "pointer", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", gap: 8 }}
                              onClick={() => openEdit(q)}
                            >
                              <PencilSimpleIcon size={14} />
                              Edit
                            </div>
                            <div
                              className="nc-hover"
                              style={{ padding: "8px 10px", fontSize: 12.5, cursor: "pointer", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", gap: 8, color: "var(--color-accent-300)" }}
                              onClick={() => void removeQuota(q.id)}
                            >
                              <TrashIcon size={14} />
                              Delete
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={6} style={{ padding: 0, border: "none" }}>
                        <div style={{ display: "grid", gridTemplateRows: expanded ? "1fr" : "0fr", transition: "grid-template-rows 260ms ease", background: "var(--color-neutral-900)" }}>
                          <div style={{ overflow: "hidden", minHeight: 0 }}>
                            <div style={{ padding: "var(--space-4) var(--space-6)", opacity: expanded ? 1 : 0, transition: `opacity 200ms ease ${expanded ? "120ms" : "0ms"}` }}>
                              <div className="nc-card-meta" style={{ marginBottom: 8 }}>
                                Previous periods · {scope.label}
                              </div>
                              {expanded && <HistoryRow quotaId={q.id} minimumMinutes={q.minimumMinutes} targetMinutes={q.targetMinutes} />}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {quotas.length === 0 && (
            <div style={{ padding: "40px 4px", textAlign: "center", color: "color-mix(in srgb, var(--color-text) 45%, transparent)", fontSize: 13 }}>
              No quotas yet.
            </div>
          )}
        </div>
      </div>

      {editorOpen && (
        <div className="nc-drawer-backdrop" onClick={closeEditor}>
          <div className="nc-drawer nc-elev-lg" style={{ overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="nc-card-title" style={{ fontSize: 16, marginBottom: 16 }}>
              {editingQuota ? "Edit Quota" : "New Quota"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="nc-field">
                <label>Scope</label>
                <select className="nc-input" value={editor.scopeValue} onChange={(e) => setEditor((s) => ({ ...s, scopeValue: e.target.value }))}>
                  <option value="global">Overall</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="nc-field">
                <label>Period</label>
                <select
                  className="nc-input"
                  value={editor.period}
                  onChange={(e) => setEditor((s) => ({ ...s, period: e.target.value as QuotaPeriod }))}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              {editor.period === "daily" && (
                <div className="nc-field">
                  <label>Weekday</label>
                  <select className="nc-input" value={editor.weekday} onChange={(e) => setEditor((s) => ({ ...s, weekday: e.target.value }))}>
                    <option value="">Any day</option>
                    {WEEKDAY_NAMES.map((name, i) => (
                      <option key={name} value={i}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <div className="nc-field" style={{ flex: 1 }}>
                  <label>Minimum (h)</label>
                  <input className="nc-input" type="number" value={editor.minimum} onChange={(e) => setEditor((s) => ({ ...s, minimum: e.target.value }))} />
                </div>
                <div className="nc-field" style={{ flex: 1 }}>
                  <label>Target (h)</label>
                  <input className="nc-input" type="number" value={editor.target} onChange={(e) => setEditor((s) => ({ ...s, target: e.target.value }))} />
                </div>
                <div className="nc-field" style={{ flex: 1 }}>
                  <label>Maximum (h)</label>
                  <input className="nc-input" type="number" value={editor.maximum} onChange={(e) => setEditor((s) => ({ ...s, maximum: e.target.value }))} />
                </div>
              </div>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                <input type="checkbox" checked={editor.active} onChange={() => setEditor((s) => ({ ...s, active: !s.active }))} />
                Active
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
              <button type="button" className="nc-btn nc-btn-primary" style={{ flex: 1 }} onClick={() => void saveEditor()}>
                Save
              </button>
              <button type="button" className="nc-btn nc-btn-secondary" style={{ flex: 1 }} onClick={closeEditor}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
