import { useState } from "react";
import type { Area } from "../areas/api";
import { createTask } from "./api";

export function QuickAddModal({
  areas,
  onClose,
  onCreated,
}: {
  areas: Area[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [areaId, setAreaId] = useState(areas[0]?.id ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState("60");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await createTask({
        title: trimmed,
        areaId: areaId || undefined,
        estimatedMinutes: Number(estimatedMinutes) || undefined,
      });
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="nc-dialog-backdrop" onClick={onClose}>
      <div className="nc-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="nc-dialog-title">New Task</div>
        <div className="nc-field">
          <label>Title</label>
          <input
            className="nc-input"
            placeholder="Task title"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div className="nc-field" style={{ flex: 1 }}>
            <label>Area</label>
            <select className="nc-input" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              <option value="">None</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="nc-field" style={{ width: 110 }}>
            <label>Minutes</label>
            <input
              className="nc-input"
              type="number"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
            />
          </div>
        </div>
        <div className="nc-dialog-actions">
          <button type="button" className="nc-btn nc-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="nc-btn nc-btn-primary" disabled={submitting || !title.trim()} onClick={() => void submit()}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
