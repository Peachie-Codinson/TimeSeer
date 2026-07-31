import {
  BookOpenIcon,
  CaretDownIcon,
  CaretUpIcon,
  ChalkboardTeacherIcon,
  FlaskIcon,
  FolderSimpleIcon,
  PlusIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import { AppSidebar } from "../../components/AppSidebar";
import { formatDueLabel } from "../../lib/format";
import "../../styles/nocturne.css";
import { fetchTasks } from "../tasks/api";
import type { Task, TaskState } from "../tasks/types";
import { type Area, createArea, fetchAreas, updateArea } from "./api";

const PALETTE = [
  "#9184d9",
  "#a7a1db",
  "#d2cefd",
  "#5d5294",
  "#d99184",
  "#d9a884",
  "#d9c184",
  "#a8d984",
  "#84d9a8",
  "#84d9c0",
  "#84c0d9",
  "#84a8d9",
  "#a884d9",
  "#d984c0",
];

const KIND_OPTIONS: { value: Area["kind"]; label: string }[] = [
  { value: "course", label: "Course" },
  { value: "research", label: "Research" },
  { value: "teaching", label: "Teaching" },
  { value: "administration", label: "Administration" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
];

const KIND_ICON: Record<Area["kind"], ReactNode> = {
  course: <BookOpenIcon size={17} />,
  research: <FlaskIcon size={17} />,
  teaching: <ChalkboardTeacherIcon size={17} />,
  administration: <FolderSimpleIcon size={17} />,
  personal: <UserIcon size={17} />,
  other: <FolderSimpleIcon size={17} />,
};

function stateTagClass(state: TaskState): string {
  if (state === "resolved") return "nc-tag-neutral";
  if (state === "in_progress") return "nc-tag-accent";
  return "nc-tag-outline";
}

function stateLabel(state: TaskState): string {
  if (state === "in_progress") return "In Progress";
  return state.charAt(0).toUpperCase() + state.slice(1);
}

export function AreasPage() {
  const queryClient = useQueryClient();
  const { data: areas = [] } = useQuery({ queryKey: ["areas"], queryFn: fetchAreas });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [editName, setEditName] = useState("");
  const [editKind, setEditKind] = useState<Area["kind"]>("other");

  const refetchAreas = () => queryClient.invalidateQueries({ queryKey: ["areas"] });

  const tasksByArea = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.areaId) continue;
    const list = tasksByArea.get(t.areaId) ?? [];
    list.push(t);
    tasksByArea.set(t.areaId, list);
  }

  const openNewArea = () => {
    setEditingArea(null);
    setEditName("");
    setEditKind("other");
    setEditorOpen(true);
  };
  const openRename = (area: Area) => {
    setEditingArea(area);
    setEditName(area.name);
    setEditorOpen(true);
  };
  const closeEditor = () => setEditorOpen(false);

  const saveEditor = async () => {
    const name = editName.trim();
    if (!name) return;
    if (editingArea) {
      await updateArea(editingArea.id, { name });
    } else {
      await createArea({ name, kind: editKind, color: PALETTE[areas.length % PALETTE.length] });
    }
    setEditorOpen(false);
    refetchAreas();
  };

  const setAreaColor = async (area: Area, color: string) => {
    setColorPickerFor(null);
    await updateArea(area.id, { color });
    refetchAreas();
  };

  const archiveArea = async (area: Area) => {
    await updateArea(area.id, { active: false });
    refetchAreas();
  };

  const visibleAreas = areas.filter((a) => a.active !== false && a.active !== 0);

  return (
    <div
      className="nc-shell"
      style={{ height: "100vh", width: "100vw", display: "flex", overflow: "hidden" }}
      onClick={() => setColorPickerFor(null)}
    >
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
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 15 }}>Areas</div>
          <button type="button" className="nc-btn nc-btn-primary" style={{ marginLeft: "auto" }} onClick={openNewArea}>
            <PlusIcon size={16} />
            New Area
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "var(--space-6)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxWidth: 640 }}>
            {visibleAreas.map((area) => {
              const areaTasks = tasksByArea.get(area.id) ?? [];
              const activeCount = areaTasks.filter((t) => t.state === "active").length;
              const inProgressCount = areaTasks.filter((t) => t.state === "in_progress").length;
              const expanded = expandedId === area.id;
              const colorPickerOpen = colorPickerFor === area.id;

              return (
                <div
                  key={area.id}
                  className="nc-card"
                  style={{ padding: 0, position: "relative", overflow: colorPickerOpen ? "visible" : "hidden" }}
                >
                  <div
                    style={{
                      padding: "var(--space-4)",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                      cursor: "pointer",
                    }}
                    onClick={() => setExpandedId((cur) => (cur === area.id ? null : area.id))}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "var(--radius-md)",
                        background: "color-mix(in srgb, var(--color-accent) 16%, transparent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "none",
                        color: "var(--color-accent)",
                      }}
                    >
                      {KIND_ICON[area.kind]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nc-card-title" style={{ fontSize: 14 }}>
                        {area.name}
                      </div>
                      <div className="nc-card-meta">
                        {activeCount} active · {inProgressCount} in progress
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: area.color ?? "var(--color-accent)",
                        border: "2px solid var(--color-neutral-800)",
                        cursor: "pointer",
                        flex: "none",
                      }}
                      title="Change label color"
                      onClick={(e) => {
                        e.stopPropagation();
                        setColorPickerFor((cur) => (cur === area.id ? null : area.id));
                      }}
                    />
                    <button
                      type="button"
                      className="nc-btn"
                      style={{ color: "var(--color-accent)" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openRename(area);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="nc-btn"
                      style={{ color: "var(--color-accent-300)" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        void archiveArea(area);
                      }}
                    >
                      Archive
                    </button>
                    {expanded ? (
                      <CaretUpIcon size={16} style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)", flex: "none" }} />
                    ) : (
                      <CaretDownIcon size={16} style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)", flex: "none" }} />
                    )}

                    {colorPickerOpen && (
                      <div
                        className="nc-card nc-elev-lg"
                        style={{ position: "absolute", top: 52, right: 16, padding: 12, zIndex: 100, width: 200, boxSizing: "border-box" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 10 }}>
                          {PALETTE.map((c) => (
                            <button
                              key={c}
                              type="button"
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: c,
                                cursor: "pointer",
                                border: "none",
                                boxShadow:
                                  c === area.color
                                    ? "0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-text)"
                                    : "none",
                              }}
                              onClick={() => void setAreaColor(area, c)}
                            />
                          ))}
                        </div>
                        <div className="nc-hr" style={{ height: 1, background: "var(--color-divider)", margin: "0 0 10px" }} />
                        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                          <div
                            style={{
                              position: "relative",
                              width: 28,
                              height: 28,
                              flex: "none",
                              borderRadius: "50%",
                              overflow: "hidden",
                              border: "2px solid var(--color-neutral-800)",
                              background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
                            }}
                          >
                            <input
                              type="color"
                              value={area.color && area.color.startsWith("#") ? area.color : "#9184d9"}
                              onChange={(e) => void setAreaColor(area, e.target.value)}
                              style={{
                                position: "absolute",
                                inset: -4,
                                width: 36,
                                height: 36,
                                padding: 0,
                                border: "none",
                                cursor: "pointer",
                                opacity: 0,
                              }}
                            />
                          </div>
                          <div style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
                            Custom color…
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateRows: expanded ? "1fr" : "0fr",
                      transition: "grid-template-rows 260ms cubic-bezier(0.2,0,0,1)",
                    }}
                  >
                    <div style={{ overflow: "hidden" }}>
                      <div
                        style={{
                          borderTop: "1px solid var(--color-divider)",
                          padding: "var(--space-3) var(--space-4)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          opacity: expanded ? 1 : 0,
                          transition: `opacity 200ms ease ${expanded ? "100ms" : "0ms"}`,
                        }}
                      >
                        {areaTasks.map((t) => (
                          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className={`nc-tag ${stateTagClass(t.state)}`}>{stateLabel(t.state)}</div>
                            <div style={{ fontSize: 13, flex: 1, minWidth: 0 }}>{t.title}</div>
                            <div className="nc-card-meta">{t.hardDeadline ? formatDueLabel(t.hardDeadline) : "—"}</div>
                          </div>
                        ))}
                        {areaTasks.length === 0 && <div className="nc-card-meta">No tasks in this area.</div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {editorOpen && (
        <div className="nc-dialog-backdrop" onClick={closeEditor}>
          <div className="nc-dialog nc-elev-lg" onClick={(e) => e.stopPropagation()}>
            <div className="nc-dialog-title">{editingArea ? "Rename area" : "New area"}</div>
            <div className="nc-field">
              <label>Name</label>
              <input className="nc-input" value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} />
            </div>
            {!editingArea && (
              <div className="nc-field">
                <label>Kind</label>
                <select className="nc-input" value={editKind} onChange={(e) => setEditKind(e.target.value as Area["kind"])}>
                  {KIND_OPTIONS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="nc-dialog-actions">
              <button type="button" className="nc-btn nc-btn-secondary" onClick={closeEditor}>
                Cancel
              </button>
              <button type="button" className="nc-btn nc-btn-primary" onClick={() => void saveEditor()}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
