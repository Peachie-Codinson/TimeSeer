import { useState } from "react";
import { Modal } from "../../components/Modal";
import type { Area } from "../areas/api";
import { createEvent, deleteEventOrOccurrence, updateEvent } from "./api";
import { fromLocalInputValue, toLocalInputValue } from "./dateUtils";
import type { EventInput } from "./types";

export interface EventEditorInitial extends Partial<EventInput> {
  eventId?: string;
  version?: number;
  recurring?: boolean;
  occurrenceStart?: number;
  title: string;
  startsAt: number;
  endsAt: number;
  timezone: string;
}

export function EventEditorModal({
  initial,
  areas,
  onClose,
  onSaved,
  onDeleted,
}: {
  initial: EventEditorInitial;
  areas: Area[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const isEditing = initial.eventId !== undefined;

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [areaId, setAreaId] = useState(initial.areaId ?? "");
  const [startsAt, setStartsAt] = useState(initial.startsAt);
  const [endsAt, setEndsAt] = useState(initial.endsAt);
  const [allDay, setAllDay] = useState(initial.allDay ?? false);
  const [recurrenceRule, setRecurrenceRule] = useState(initial.recurrenceRule ?? "");
  const [locationName, setLocationName] = useState(initial.locationName ?? "");
  const [locationUrl, setLocationUrl] = useState(initial.locationUrl ?? "");
  const [meetingUrl, setMeetingUrl] = useState(initial.meetingUrl ?? "");
  const [travelMinutes, setTravelMinutes] = useState(initial.travelMinutes?.toString() ?? "");
  const [preparationMinutes, setPreparationMinutes] = useState(initial.preparationMinutes?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildInput = (): EventInput => ({
    title: title.trim() || "Untitled event",
    description: description.trim() || undefined,
    areaId: areaId || undefined,
    startsAt,
    endsAt,
    timezone: initial.timezone,
    allDay,
    recurrenceRule: recurrenceRule.trim() || undefined,
    locationName: locationName.trim() || undefined,
    locationUrl: locationUrl.trim() || undefined,
    meetingUrl: meetingUrl.trim() || undefined,
    travelMinutes: travelMinutes ? Number(travelMinutes) : undefined,
    preparationMinutes: preparationMinutes ? Number(preparationMinutes) : undefined,
  });

  const handleSave = async () => {
    if (!allDay && endsAt <= startsAt) {
      setError("End must be after start.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEditing && initial.eventId && initial.version !== undefined) {
        await updateEvent(initial.eventId, { ...buildInput(), expectedVersion: initial.version });
      } else {
        await createEvent(buildInput());
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial.eventId) return;
    const deleted = await deleteEventOrOccurrence({
      id: initial.eventId,
      recurring: initial.recurring ?? false,
      occurrenceStart: initial.occurrenceStart ?? initial.startsAt,
    });
    if (deleted) onDeleted();
  };

  return (
    <Modal title={isEditing ? "Edit event" : "New event"} onClose={onClose} wide>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="input"
        />

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-slate-400">
            Start
            <input
              type="datetime-local"
              value={toLocalInputValue(startsAt)}
              onChange={(e) => setStartsAt(fromLocalInputValue(e.target.value))}
              className="input mt-1"
            />
          </label>
          <label className="block text-xs text-slate-400">
            End
            <input
              type="datetime-local"
              value={toLocalInputValue(endsAt)}
              onChange={(e) => setEndsAt(fromLocalInputValue(e.target.value))}
              className="input mt-1"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          All day
        </label>

        <div className="grid grid-cols-2 gap-2">
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
          <label className="block text-xs text-slate-400">
            Recurrence (RRULE)
            <input
              placeholder="e.g. FREQ=WEEKLY;BYDAY=MO,WE,FR"
              value={recurrenceRule}
              onChange={(e) => setRecurrenceRule(e.target.value)}
              className="input mt-1"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-slate-400">
            Location
            <input value={locationName} onChange={(e) => setLocationName(e.target.value)} className="input mt-1" />
          </label>
          <label className="block text-xs text-slate-400">
            Location URL
            <input value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} className="input mt-1" />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="block text-xs text-slate-400">
            Meeting URL
            <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} className="input mt-1" />
          </label>
          <label className="block text-xs text-slate-400">
            Travel (min)
            <input
              type="number"
              value={travelMinutes}
              onChange={(e) => setTravelMinutes(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Prep (min)
            <input
              type="number"
              value={preparationMinutes}
              onChange={(e) => setPreparationMinutes(e.target.value)}
              className="input mt-1"
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {isEditing ? (
            <button type="button" className="text-sm text-red-400 hover:text-red-300" onClick={handleDelete}>
              Delete
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={saving}
            className="btn-primary w-auto px-4 py-1.5"
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
