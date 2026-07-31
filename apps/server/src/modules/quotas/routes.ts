import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireSession } from "../../middleware/auth.js";
import {
  NotFoundError,
  computeAllQuotaProgress,
  computeQuotaHistory,
  computeQuotaSummary,
  createQuota,
  deleteQuota,
  getQuota,
  listQuotas,
  updateQuota,
} from "./service.js";

const quotaFields = z.object({
  scopeType: z.string().min(1),
  scopeId: z.string().optional(),
  period: z.string().min(1),
  weekday: z.number().int().min(0).max(6).optional(),
  minimumMinutes: z.number().int().optional(),
  targetMinutes: z.number().int().optional(),
  maximumMinutes: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const quotasRoutes = new Hono()
  .use("*", requireSession)

  .get("/", (c) => c.json(listQuotas()))

  .post("/", zValidator("json", quotaFields), (c) => c.json(createQuota(c.req.valid("json")), 201))

  .get("/summary", (c) => c.json(computeQuotaSummary()))

  .get("/progress", (c) => c.json(computeAllQuotaProgress()))

  .get("/:quotaId/history", zValidator("query", z.object({ count: z.string().optional() })), (c) => {
    const quota = getQuota(c.req.param("quotaId"));
    if (!quota) throw new HTTPException(404, { message: "Quota not found" });
    const count = Math.min(12, Math.max(1, Number(c.req.valid("query").count ?? 6)));
    return c.json(computeQuotaHistory(quota, count));
  })

  .patch("/:quotaId", zValidator("json", quotaFields.partial()), (c) => {
    try {
      return c.json(updateQuota(c.req.param("quotaId"), c.req.valid("json")));
    } catch (err) {
      if (err instanceof NotFoundError) throw new HTTPException(404, { message: "Quota not found" });
      throw err;
    }
  })

  .delete("/:quotaId", (c) => {
    deleteQuota(c.req.param("quotaId"));
    return c.body(null, 204);
  });
