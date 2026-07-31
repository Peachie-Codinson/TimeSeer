import { Modal } from "../../components/Modal";
import { openExternal } from "../../platform/tauri";
import type { Area } from "../areas/api";
import { deleteEventOrOccurrence } from "./api";
import type { EventOccurrence } from "./types";

export function EventDetailsPopover({
  occurrence,
  area,
  onClose,
  onEdit,
  onDeleted,
}: {
  occurrence: EventOccurrence;
  area: Area | undefined;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const formatRange = () => {
    const start = new Date(occurrence.startsAt);
    const end = new Date(occurrence.endsAt);
    if (occurrence.allDay) return start.toLocaleDateString(undefined, { dateStyle: "medium" });
    const dateStr = start.toLocaleDateString(undefined, { dateStyle: "medium" });
    const startStr = start.toLocaleTimeString(undefined, { timeStyle: "short" });
    const endStr = end.toLocaleTimeString(undefined, { timeStyle: "short" });
    return `${dateStr} · ${startStr} – ${endStr}`;
  };

  return (
    <Modal title={occurrence.title} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5 }}>
        {area && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: area.color ?? "var(--color-neutral-600)" }} />
            {area.name}
          </div>
        )}
        <div>{formatRange()}</div>
        {occurrence.recurring && <div className="nc-card-meta">Recurring event</div>}
        {occurrence.locationName &&
          (occurrence.locationUrl ? (
            <a href="#" onClick={(e) => { e.preventDefault(); void openExternal(occurrence.locationUrl!); }}>
              {occurrence.locationName}
            </a>
          ) : (
            <div>{occurrence.locationName}</div>
          ))}
        {occurrence.meetingUrl && (
          <a href="#" onClick={(e) => { e.preventDefault(); void openExternal(occurrence.meetingUrl!); }}>
            Join meeting
          </a>
        )}
        {occurrence.description && (
          <div style={{ whiteSpace: "pre-wrap", color: "color-mix(in srgb, var(--color-text) 70%, transparent)" }}>{occurrence.description}</div>
        )}

        <div className="nc-dialog-actions" style={{ justifyContent: "space-between" }}>
          <button
            type="button"
            className="nc-btn"
            style={{ color: "var(--color-accent-300)" }}
            onClick={async () => {
              const deleted = await deleteEventOrOccurrence(occurrence);
              if (deleted) onDeleted();
            }}
          >
            Delete
          </button>
          <button type="button" className="nc-btn nc-btn-secondary" onClick={onEdit}>
            Edit
          </button>
        </div>
      </div>
    </Modal>
  );
}
