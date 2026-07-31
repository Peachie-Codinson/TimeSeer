import { useState } from "react";
import { Modal } from "../../components/Modal";
import type { Area } from "../areas/api";
import { fromLocalInputValue, toLocalInputValue } from "./dateUtils";

export interface QuickCreateDraft {
  start: number;
  end: number;
  allDay: boolean;
}

export function QuickCreatePopover({
  draft,
  areas,
  onClose,
  onSave,
  onMoreOptions,
}: {
  draft: QuickCreateDraft;
  areas: Area[];
  onClose: () => void;
  onSave: (input: { title: string; start: number; end: number; areaId?: string }) => Promise<void>;
  onMoreOptions: (input: { title: string; start: number; end: number; areaId?: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(draft.start);
  const [end, setEnd] = useState(draft.end);
  const [areaId, setAreaId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentValues = () => ({ title: title.trim() || "Untitled event", start, end, areaId: areaId || undefined });

  return (
    <Modal title="New event" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input autoFocus placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="nc-input" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div className="nc-field">
            <label>Start</label>
            <input
              type="datetime-local"
              value={toLocalInputValue(start)}
              onChange={(e) => setStart(fromLocalInputValue(e.target.value))}
              className="nc-input"
            />
          </div>
          <div className="nc-field">
            <label>End</label>
            <input
              type="datetime-local"
              value={toLocalInputValue(end)}
              onChange={(e) => setEnd(fromLocalInputValue(e.target.value))}
              className="nc-input"
            />
          </div>
        </div>
        <div className="nc-field">
          <label>Area</label>
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="nc-input">
            <option value="">None</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
        {error && <div style={{ fontSize: 12, color: "var(--color-accent-300)" }}>{error}</div>}
        <div className="nc-dialog-actions" style={{ justifyContent: "space-between", marginTop: 0 }}>
          <button type="button" className="nc-btn" onClick={() => onMoreOptions(currentValues())}>
            More options
          </button>
          <button
            type="button"
            disabled={saving || end <= start}
            className="nc-btn nc-btn-primary"
            onClick={async () => {
              setSaving(true);
              setError(null);
              try {
                await onSave(currentValues());
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to save");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
