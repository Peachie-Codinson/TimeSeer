import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireSession } from "../../middleware/auth.js";
import { expandEventsInRange } from "../calendar/service.js";

// Tasks (Stage 4) and quotas (Stage 5) don't exist yet; the shape here matches
// the eventual response so the web dashboard doesn't need to change later.
export const dashboardRoutes = new Hono()
  .use("*", requireSession)
  .get(
    "/",
    zValidator(
      "query",
      z.object({
        rangeStart: z.coerce.number().int(),
        rangeEnd: z.coerce.number().int(),
        timezone: z.string().optional(),
        calendarView: z.string().optional(),
      }),
    ),
    (c) => {
      const { rangeStart, rangeEnd } = c.req.valid("query");

      // Explicitly typed so the empty placeholder arrays don't infer as
      // `never[]` (which would poison the Hono RPC client's response type).
      const response: {
        calendar: {
          events: ReturnType<typeof expandEventsInRange>;
          workSessions: unknown[];
          deadlines: unknown[];
        };
        tasks: {
          now: unknown[];
          inProgress: unknown[];
          urgent: unknown[];
          activeNext: unknown[];
        };
        quotaSummary: {
          completedMinutes: number;
          scheduledMinutes: number;
          targetMinutes: number;
          remainingMinutes: number;
        };
      } = {
        calendar: {
          events: expandEventsInRange(rangeStart, rangeEnd),
          workSessions: [],
          deadlines: [],
        },
        tasks: {
          now: [],
          inProgress: [],
          urgent: [],
          activeNext: [],
        },
        quotaSummary: {
          completedMinutes: 0,
          scheduledMinutes: 0,
          targetMinutes: 0,
          remainingMinutes: 0,
        },
      };

      return c.json(response);
    },
  );
