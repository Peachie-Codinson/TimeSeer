import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireSession } from "../../middleware/auth.js";
import { NotFoundError, createWorkSession } from "./service.js";

export const workSessionsRoutes = new Hono().use("*", requireSession).post(
  "/",
  zValidator(
    "json",
    z
      .object({
        taskId: z.string().min(1),
        startsAt: z.number().int(),
        endsAt: z.number().int(),
      })
      .refine((data) => data.endsAt > data.startsAt, { message: "endsAt must be after startsAt", path: ["endsAt"] }),
  ),
  (c) => {
    try {
      return c.json(createWorkSession(c.req.valid("json")), 201);
    } catch (err) {
      if (err instanceof NotFoundError) throw new HTTPException(404, { message: "Task not found" });
      throw err;
    }
  },
);
