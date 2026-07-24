import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireSession } from "../../middleware/auth.js";
import { expandEventsInRange } from "../calendar/service.js";
import { getDashboardTaskLists } from "../tasks/service.js";
import { listWorkSessionsInRange } from "../work-sessions/service.js";

// Quotas (Stage 5) don't exist yet; "now" needs a Stage 5+ work-session lifecycle
// (currently sessions only ever reach "planned"), so it stays empty until then.
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
      const taskLists = getDashboardTaskLists(Date.now());

      // "now" is explicitly typed as never[] rather than left implicit, so it
      // doesn't infer `never[]` in a way that poisons the whole response's
      // type in the Hono RPC client (as an empty array literal would).
      const response: {
        calendar: {
          events: ReturnType<typeof expandEventsInRange>;
          workSessions: ReturnType<typeof listWorkSessionsInRange>;
          deadlines: unknown[];
        };
        tasks: {
          now: never[];
          inProgress: typeof taskLists.inProgress;
          urgent: typeof taskLists.urgent;
          activeNext: typeof taskLists.activeNext;
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
          workSessions: listWorkSessionsInRange(rangeStart, rangeEnd),
          deadlines: [],
        },
        tasks: {
          now: [],
          ...taskLists,
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
