import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireSession } from "../../middleware/auth.js";
import { listWorkSessionsInRange } from "../work-sessions/service.js";
import {
  ConflictError,
  NotFoundError,
  cancelOccurrence,
  createEvent,
  deleteEvent,
  expandEventsInRange,
  getEvent,
  moveOccurrence,
  updateEvent,
} from "./service.js";

const eventFields = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  areaId: z.string().optional(),
  startsAt: z.number().int(),
  endsAt: z.number().int(),
  timezone: z.string().min(1),
  allDay: z.boolean().optional(),
  recurrenceRule: z.string().optional(),
  locationName: z.string().optional(),
  locationUrl: z.string().optional(),
  meetingUrl: z.string().optional(),
  travelMinutes: z.number().int().optional(),
  preparationMinutes: z.number().int().optional(),
  locked: z.boolean().optional(),
});

const eventCreateSchema = eventFields.refine((data) => data.allDay || data.endsAt > data.startsAt, {
  message: "endsAt must be after startsAt",
  path: ["endsAt"],
});

const eventUpdateSchema = eventFields.partial().extend({ expectedVersion: z.number().int() });

export const calendarRoutes = new Hono()
  .use("*", requireSession)
  .get(
    "/",
    zValidator("query", z.object({ start: z.coerce.number().int(), end: z.coerce.number().int() })),
    (c) => {
      const { start, end } = c.req.valid("query");
      return c.json({
        events: expandEventsInRange(start, end),
        workSessions: listWorkSessionsInRange(start, end),
        deadlines: [],
      });
    },
  );

export const eventsRoutes = new Hono()
  .use("*", requireSession)

  .post("/", zValidator("json", eventCreateSchema), (c) => {
    const event = createEvent(c.req.valid("json"));
    return c.json(event, 201);
  })

  .get("/:eventId", (c) => {
    const event = getEvent(c.req.param("eventId"));
    if (!event) throw new HTTPException(404, { message: "Event not found" });
    return c.json(event);
  })

  .patch("/:eventId", zValidator("json", eventUpdateSchema), (c) => {
    const { expectedVersion, ...patch } = c.req.valid("json");
    try {
      const event = updateEvent(c.req.param("eventId"), patch, expectedVersion);
      return c.json(event);
    } catch (err) {
      if (err instanceof NotFoundError) throw new HTTPException(404, { message: "Event not found" });
      if (err instanceof ConflictError) throw new HTTPException(409, { message: "Event was modified elsewhere" });
      throw err;
    }
  })

  .delete("/:eventId", (c) => {
    deleteEvent(c.req.param("eventId"));
    return c.body(null, 204);
  })

  .patch(
    "/:eventId/occurrences/:occurrenceStart",
    zValidator("json", z.object({ replacementStart: z.number().int(), replacementEnd: z.number().int() })),
    (c) => {
      const { replacementStart, replacementEnd } = c.req.valid("json");
      const occurrenceStart = Number(c.req.param("occurrenceStart"));
      const exception = moveOccurrence(c.req.param("eventId"), occurrenceStart, {
        replacementStart,
        replacementEnd,
      });
      return c.json(exception);
    },
  )

  .delete("/:eventId/occurrences/:occurrenceStart", (c) => {
    const occurrenceStart = Number(c.req.param("occurrenceStart"));
    cancelOccurrence(c.req.param("eventId"), occurrenceStart);
    return c.body(null, 204);
  });
