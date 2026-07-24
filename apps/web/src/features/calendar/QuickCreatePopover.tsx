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
      <div className="space-y-3">
        <input
          autoFocus
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-slate-400">
            Start
            <input
              type="datetime-local"
              value={toLocalInputValue(start)}
              onChange={(e) => setStart(fromLocalInputValue(e.target.value))}
              className="input mt-1"
            />
          </label>
          <label className="block text-xs text-slate-400">
            End
            <input
              type="datetime-local"
              value={toLocalInputValue(end)}
              onChange={(e) => setEnd(fromLocalInputValue(e.target.value))}
              className="input mt-1"
            />
          </label>
        </div>
        <label className="block text-xs text-slate-400">
          Area
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="input mt-1">
            <option value="">None</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            className="text-sm text-slate-400 hover:text-white"
            onClick={() => onMoreOptions(currentValues())}
          >
            More options
          </button>
          <button
            type="button"
            disabled={saving || end <= start}
            className="btn-primary w-auto px-4 py-1.5"
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
