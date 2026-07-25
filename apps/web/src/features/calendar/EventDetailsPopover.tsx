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
      <div className="space-y-2 text-sm">
        {area && (
          <p className="flex items-center gap-2 text-slate-300">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: area.color ?? "#64748b" }} />
            {area.name}
          </p>
        )}
        <p className="text-slate-300">{formatRange()}</p>
        {occurrence.recurring && <p className="text-xs text-slate-500">Recurring event</p>}
        {occurrence.locationName &&
          (occurrence.locationUrl ? (
            <button
              className="block text-left text-slate-300 underline decoration-slate-600 hover:text-white"
              onClick={() => void openExternal(occurrence.locationUrl!)}
            >
              {occurrence.locationName}
            </button>
          ) : (
            <p className="text-slate-300">{occurrence.locationName}</p>
          ))}
        {occurrence.meetingUrl && (
          <button
            className="block text-emerald-400 hover:text-emerald-300"
            onClick={() => void openExternal(occurrence.meetingUrl!)}
          >
            Join meeting
          </button>
        )}
        {occurrence.description && <p className="whitespace-pre-wrap text-slate-400">{occurrence.description}</p>}

        <div className="flex items-center justify-between pt-3">
          <button
            className="text-sm text-red-400 hover:text-red-300"
            onClick={async () => {
              const deleted = await deleteEventOrOccurrence(occurrence);
              if (deleted) onDeleted();
            }}
          >
            Delete
          </button>
          <button className="btn-secondary" onClick={onEdit}>
            Edit
          </button>
        </div>
      </div>
    </Modal>
  );
}
