import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireSession } from "../../middleware/auth.js";
import { expandEventsInRange } from "../calendar/service.js";
import { computeQuotaSummary } from "../quotas/service.js";
import { getDashboardTaskLists } from "../tasks/service.js";
import { listTasksWithActiveSession, listWorkSessionsInRange } from "../work-sessions/service.js";

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

      const response: {
        calendar: {
          events: ReturnType<typeof expandEventsInRange>;
          workSessions: ReturnType<typeof listWorkSessionsInRange>;
          deadlines: unknown[];
        };
        tasks: {
          now: ReturnType<typeof listTasksWithActiveSession>;
          inProgress: typeof taskLists.inProgress;
          urgent: typeof taskLists.urgent;
          activeNext: typeof taskLists.activeNext;
        };
        quotaSummary: ReturnType<typeof computeQuotaSummary>;
      } = {
        calendar: {
          events: expandEventsInRange(rangeStart, rangeEnd),
          workSessions: listWorkSessionsInRange(rangeStart, rangeEnd),
          deadlines: [],
        },
        tasks: {
          now: listTasksWithActiveSession(),
          ...taskLists,
        },
        quotaSummary: computeQuotaSummary(),
      };

      return c.json(response);
    },
  );
