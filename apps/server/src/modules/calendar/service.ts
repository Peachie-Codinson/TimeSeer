import { and, eq } from "drizzle-orm";
import rrulePkg from "rrule";
import { db } from "../../db/connection.js";

// rrule ships a UMD bundle; Node's ESM/CJS interop can't statically detect
// named exports from it, so pull RRule off the default export at runtime.
const { RRule } = rrulePkg;
import { eventExceptions, events } from "../../db/schema.js";

export class ConflictError extends Error {}
export class NotFoundError extends Error {}

export interface EventOccurrence {
  id: string;
  occurrenceStart: number;
  title: string;
  description: string | null;
  areaId: string | null;
  startsAt: number;
  endsAt: number;
  timezone: string;
  allDay: boolean;
  locationName: string | null;
  locationUrl: string | null;
  meetingUrl: string | null;
  travelMinutes: number | null;
  preparationMinutes: number | null;
  locked: boolean;
  recurring: boolean;
  version: number;
}

type EventRow = typeof events.$inferSelect;

function toOccurrence(event: EventRow, occurrenceStart: number, startsAt: number, endsAt: number): EventOccurrence {
  return {
    id: event.id,
    occurrenceStart,
    title: event.title,
    description: event.description,
    areaId: event.areaId,
    startsAt,
    endsAt,
    timezone: event.timezone,
    allDay: event.allDay === 1,
    locationName: event.locationName,
    locationUrl: event.locationUrl,
    meetingUrl: event.meetingUrl,
    travelMinutes: event.travelMinutes,
    preparationMinutes: event.preparationMinutes,
    locked: event.locked === 1,
    recurring: event.recurrenceRule !== null,
    version: event.version,
  };
}

/** Expands every event overlapping [rangeStart, rangeEnd) into concrete occurrences, applying exceptions. */
export function expandEventsInRange(rangeStart: number, rangeEnd: number): EventOccurrence[] {
  const allEvents = db.select().from(events).all();
  const results: EventOccurrence[] = [];

  for (const event of allEvents) {
    if (!event.recurrenceRule) {
      if (event.startsAt < rangeEnd && event.endsAt > rangeStart) {
        results.push(toOccurrence(event, event.startsAt, event.startsAt, event.endsAt));
      }
      continue;
    }

    const duration = event.endsAt - event.startsAt;
    let rule: InstanceType<typeof RRule>;
    try {
      const options = RRule.parseString(event.recurrenceRule);
      options.dtstart = new Date(event.startsAt);
      rule = new RRule(options);
    } catch {
      continue; // malformed recurrence rule; skip rather than break the whole range
    }

    const exceptions = db
      .select()
      .from(eventExceptions)
      .where(eq(eventExceptions.eventId, event.id))
      .all();
    const exceptionByOriginalStart = new Map(exceptions.map((e) => [e.originalStart, e]));

    // widen the lower bound by the event duration so occurrences that start
    // before the range but still overlap it are not missed
    const occurrenceStarts = rule.between(new Date(rangeStart - duration), new Date(rangeEnd), true);

    for (const occurrenceDate of occurrenceStarts) {
      const originalStart = occurrenceDate.getTime();
      const exception = exceptionByOriginalStart.get(originalStart);

      if (exception?.kind === "cancelled") continue;

      let start = originalStart;
      let end = originalStart + duration;
      if (exception?.kind === "moved" && exception.replacementStart !== null && exception.replacementEnd !== null) {
        start = exception.replacementStart;
        end = exception.replacementEnd;
      }

      if (start < rangeEnd && end > rangeStart) {
        results.push(toOccurrence(event, originalStart, start, end));
      }
    }
  }

  return results.sort((a, b) => a.startsAt - b.startsAt);
}

export interface EventInput {
  title: string;
  description?: string;
  areaId?: string;
  startsAt: number;
  endsAt: number;
  timezone: string;
  allDay?: boolean;
  recurrenceRule?: string;
  locationName?: string;
  locationUrl?: string;
  meetingUrl?: string;
  travelMinutes?: number;
  preparationMinutes?: number;
  locked?: boolean;
}

export function createEvent(input: EventInput) {
  const now = Date.now();
  return db
    .insert(events)
    .values({
      title: input.title,
      description: input.description,
      areaId: input.areaId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      timezone: input.timezone,
      allDay: input.allDay ? 1 : 0,
      recurrenceRule: input.recurrenceRule,
      locationName: input.locationName,
      locationUrl: input.locationUrl,
      meetingUrl: input.meetingUrl,
      travelMinutes: input.travelMinutes,
      preparationMinutes: input.preparationMinutes,
      locked: input.locked === false ? 0 : 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
}

export function getEvent(eventId: string) {
  return db.select().from(events).where(eq(events.id, eventId)).get();
}

export function updateEvent(eventId: string, input: Partial<EventInput>, expectedVersion: number) {
  return db.transaction((tx) => {
    const current = tx.select().from(events).where(eq(events.id, eventId)).get();
    if (!current) throw new NotFoundError();
    if (current.version !== expectedVersion) throw new ConflictError();

    return tx
      .update(events)
      .set({
        ...input,
        allDay: input.allDay === undefined ? undefined : input.allDay ? 1 : 0,
        locked: input.locked === undefined ? undefined : input.locked ? 1 : 0,
        version: current.version + 1,
        updatedAt: Date.now(),
      })
      .where(eq(events.id, eventId))
      .returning()
      .get();
  });
}

export function deleteEvent(eventId: string) {
  db.transaction((tx) => {
    tx.delete(eventExceptions).where(eq(eventExceptions.eventId, eventId)).run();
    tx.delete(events).where(eq(events.id, eventId)).run();
  });
}

export interface OccurrenceMovePatch {
  replacementStart: number;
  replacementEnd: number;
}

export function moveOccurrence(eventId: string, originalStart: number, patch: OccurrenceMovePatch) {
  return upsertException(eventId, originalStart, {
    kind: "moved",
    replacementStart: patch.replacementStart,
    replacementEnd: patch.replacementEnd,
  });
}

export function cancelOccurrence(eventId: string, originalStart: number) {
  return upsertException(eventId, originalStart, {
    kind: "cancelled",
    replacementStart: undefined,
    replacementEnd: undefined,
  });
}

function upsertException(
  eventId: string,
  originalStart: number,
  patch: { kind: "moved" | "cancelled"; replacementStart?: number; replacementEnd?: number },
) {
  const existing = db
    .select()
    .from(eventExceptions)
    .where(and(eq(eventExceptions.eventId, eventId), eq(eventExceptions.originalStart, originalStart)))
    .get();

  const values = {
    kind: patch.kind,
    replacementStart: patch.replacementStart ?? null,
    replacementEnd: patch.replacementEnd ?? null,
  };

  if (existing) {
    return db.update(eventExceptions).set(values).where(eq(eventExceptions.id, existing.id)).returning().get();
  }

  return db
    .insert(eventExceptions)
    .values({ eventId, originalStart, ...values })
    .returning()
    .get();
}
