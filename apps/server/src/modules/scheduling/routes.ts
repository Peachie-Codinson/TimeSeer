import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireSession } from "../../middleware/auth.js";
import { applySchedule, previewSchedule, scheduleRisks } from "./service.js";

const rangeQuery = z.object({ rangeStart: z.coerce.number().int(), rangeEnd: z.coerce.number().int() });

export const schedulingRoutes = new Hono()
  .use("*", requireSession)

  .post("/preview", zValidator("query", rangeQuery), (c) => {
    const { rangeStart, rangeEnd } = c.req.valid("query");
    return c.json(previewSchedule(rangeStart, rangeEnd));
  })

  .post(
    "/apply",
    zValidator(
      "json",
      z.object({
        proposals: z.array(
          z.object({ taskId: z.string().min(1), startsAt: z.number().int(), endsAt: z.number().int() }),
        ),
      }),
    ),
    (c) => c.json(applySchedule(c.req.valid("json").proposals), 201),
  )

  .get("/risks", zValidator("query", rangeQuery), (c) => {
    const { rangeStart, rangeEnd } = c.req.valid("query");
    return c.json(scheduleRisks(rangeStart, rangeEnd));
  });
