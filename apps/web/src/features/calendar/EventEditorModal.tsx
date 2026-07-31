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
      <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 4, display: "flex", flexDirection: "column", gap: 10 }}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="nc-input" />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="nc-input" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div className="nc-field">
            <label>Start</label>
            <input type="datetime-local" value={toLocalInputValue(startsAt)} onChange={(e) => setStartsAt(fromLocalInputValue(e.target.value))} className="nc-input" />
          </div>
          <div className="nc-field">
            <label>End</label>
            <input type="datetime-local" value={toLocalInputValue(endsAt)} onChange={(e) => setEndsAt(fromLocalInputValue(e.target.value))} className="nc-input" />
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          All day
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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
          <div className="nc-field">
            <label>Recurrence (RRULE)</label>
            <input placeholder="e.g. FREQ=WEEKLY;BYDAY=MO,WE,FR" value={recurrenceRule} onChange={(e) => setRecurrenceRule(e.target.value)} className="nc-input" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div className="nc-field">
            <label>Location</label>
            <input value={locationName} onChange={(e) => setLocationName(e.target.value)} className="nc-input" />
          </div>
          <div className="nc-field">
            <label>Location URL</label>
            <input value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} className="nc-input" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div className="nc-field">
            <label>Meeting URL</label>
            <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} className="nc-input" />
          </div>
          <div className="nc-field">
            <label>Travel (min)</label>
            <input type="number" value={travelMinutes} onChange={(e) => setTravelMinutes(e.target.value)} className="nc-input" />
          </div>
          <div className="nc-field">
            <label>Prep (min)</label>
            <input type="number" value={preparationMinutes} onChange={(e) => setPreparationMinutes(e.target.value)} className="nc-input" />
          </div>
        </div>

        {error && <div style={{ fontSize: 12, color: "var(--color-accent-300)" }}>{error}</div>}

        <div className="nc-dialog-actions" style={{ justifyContent: "space-between" }}>
          {isEditing ? (
            <button type="button" className="nc-btn" style={{ color: "var(--color-accent-300)" }} onClick={handleDelete}>
              Delete
            </button>
          ) : (
            <span />
          )}
          <button type="button" disabled={saving} className="nc-btn nc-btn-primary" onClick={handleSave}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
