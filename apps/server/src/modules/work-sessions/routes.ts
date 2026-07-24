import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireSession } from "../../middleware/auth.js";
import {
  ConflictError,
  LockedError,
  NotFoundError,
  completeSession,
  createWorkSession,
  deleteWorkSession,
  getWorkSession,
  partialSession,
  setSessionLocked,
  skipSession,
  startSession,
  updateWorkSession,
} from "./service.js";

const versionOnlySchema = z.object({ expectedVersion: z.number().int() });

function withGuards<T>(fn: () => T) {
  try {
    return fn();
  } catch (err) {
    if (err instanceof NotFoundError) throw new HTTPException(404, { message: "Work session not found" });
    if (err instanceof ConflictError) throw new HTTPException(409, { message: "Work session was modified elsewhere" });
    if (err instanceof LockedError) throw new HTTPException(409, { message: "Work session is locked" });
    throw err;
  }
}

export const workSessionsRoutes = new Hono()
  .use("*", requireSession)

  .post(
    "/",
    zValidator(
      "json",
      z
        .object({ taskId: z.string().min(1), startsAt: z.number().int(), endsAt: z.number().int() })
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
  )

  .get("/:sessionId", (c) => {
    const session = getWorkSession(c.req.param("sessionId"));
    if (!session) throw new HTTPException(404, { message: "Work session not found" });
    return c.json(session);
  })

  .patch(
    "/:sessionId",
    zValidator(
      "json",
      z.object({
        startsAt: z.number().int().optional(),
        endsAt: z.number().int().optional(),
        notes: z.string().optional(),
        expectedVersion: z.number().int(),
      }),
    ),
    (c) => {
      const { expectedVersion, ...patch } = c.req.valid("json");
      return c.json(withGuards(() => updateWorkSession(c.req.param("sessionId"), patch, expectedVersion)));
    },
  )

  .delete("/:sessionId", (c) => {
    withGuards(() => deleteWorkSession(c.req.param("sessionId")));
    return c.body(null, 204);
  })

  .post("/:sessionId/start", zValidator("json", versionOnlySchema), (c) =>
    c.json(withGuards(() => startSession(c.req.param("sessionId"), c.req.valid("json").expectedVersion))),
  )

  .post(
    "/:sessionId/complete",
    zValidator("json", versionOnlySchema.extend({ actualMinutes: z.number().int().optional() })),
    (c) => {
      const { expectedVersion, actualMinutes } = c.req.valid("json");
      return c.json(withGuards(() => completeSession(c.req.param("sessionId"), expectedVersion, actualMinutes)));
    },
  )

  .post(
    "/:sessionId/partial",
    zValidator("json", versionOnlySchema.extend({ actualMinutes: z.number().int() })),
    (c) => {
      const { expectedVersion, actualMinutes } = c.req.valid("json");
      return c.json(withGuards(() => partialSession(c.req.param("sessionId"), expectedVersion, actualMinutes)));
    },
  )

  .post("/:sessionId/skip", zValidator("json", versionOnlySchema), (c) =>
    c.json(withGuards(() => skipSession(c.req.param("sessionId"), c.req.valid("json").expectedVersion))),
  )

  .post("/:sessionId/lock", zValidator("json", versionOnlySchema), (c) =>
    c.json(withGuards(() => setSessionLocked(c.req.param("sessionId"), c.req.valid("json").expectedVersion, true))),
  )

  .post("/:sessionId/unlock", zValidator("json", versionOnlySchema), (c) =>
    c.json(withGuards(() => setSessionLocked(c.req.param("sessionId"), c.req.valid("json").expectedVersion, false))),
  );
