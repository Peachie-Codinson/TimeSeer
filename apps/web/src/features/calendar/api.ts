import { apiClient } from "../../api/client";
import type { EventInput } from "./types";

async function readErrorCode(res: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
      return body.error;
    }
  } catch {
    // ignore parse failures, fall through to the default message
  }
  return fallback;
}

export async function fetchCalendarRange(start: number, end: number) {
  const res = await apiClient.calendar.$get({ query: { start: String(start), end: String(end) } });
  if (!res.ok) throw new Error("Failed to load calendar");
  return res.json();
}

export async function fetchEvent(eventId: string) {
  const res = await apiClient.events[":eventId"].$get({ param: { eventId } });
  if (!res.ok) throw new Error("Failed to load event");
  return res.json();
}

export async function createEvent(input: EventInput) {
  const res = await apiClient.events.$post({ json: input });
  if (!res.ok) throw new Error(await readErrorCode(res, "create_event_failed"));
  return res.json();
}

export async function updateEvent(eventId: string, input: Partial<EventInput> & { expectedVersion: number }) {
  const res = await apiClient.events[":eventId"].$patch({ param: { eventId }, json: input });
  if (!res.ok) throw new Error(await readErrorCode(res, "update_event_failed"));
  return res.json();
}

export async function deleteEvent(eventId: string) {
  const res = await apiClient.events[":eventId"].$delete({ param: { eventId } });
  if (!res.ok) throw new Error("Failed to delete event");
}

export async function moveOccurrence(
  eventId: string,
  occurrenceStart: number,
  replacementStart: number,
  replacementEnd: number,
) {
  const res = await apiClient.events[":eventId"].occurrences[":occurrenceStart"].$patch({
    param: { eventId, occurrenceStart: String(occurrenceStart) },
    json: { replacementStart, replacementEnd },
  });
  if (!res.ok) throw new Error("Failed to move occurrence");
  return res.json();
}

export async function cancelOccurrence(eventId: string, occurrenceStart: number) {
  const res = await apiClient.events[":eventId"].occurrences[":occurrenceStart"].$delete({
    param: { eventId, occurrenceStart: String(occurrenceStart) },
  });
  if (!res.ok) throw new Error("Failed to cancel occurrence");
}

/** Confirms with the user, then deletes either a single recurring occurrence or the whole event. Returns whether anything was deleted. */
export async function deleteEventOrOccurrence(occ: {
  id: string;
  recurring: boolean;
  occurrenceStart: number;
}): Promise<boolean> {
  if (occ.recurring) {
    const thisOccurrenceOnly = window.confirm(
      "Delete only this occurrence?\n\nOK = this occurrence only\nCancel = choose to delete the entire series",
    );
    if (thisOccurrenceOnly) {
      await cancelOccurrence(occ.id, occ.occurrenceStart);
      return true;
    }
    if (!window.confirm("Delete the entire recurring series? This cannot be undone.")) return false;
    await deleteEvent(occ.id);
    return true;
  }

  if (!window.confirm("Delete this event? This cannot be undone.")) return false;
  await deleteEvent(occ.id);
  return true;
}
