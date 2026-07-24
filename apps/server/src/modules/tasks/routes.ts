import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireSession } from "../../middleware/auth.js";
import {
  ConflictError,
  NotFoundError,
  blockTask,
  createTask,
  getBoard,
  getTask,
  listTasks,
  moveTask,
  resolveTask,
  reopenTask,
  returnToActive,
  snoozeTask,
  startTask,
  unblockTask,
  updateTask,
} from "./service.js";

const taskFields = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  areaId: z.string().optional(),
  priority: z.number().int().optional(),
  earliestStart: z.number().int().optional(),
  preferredStart: z.number().int().optional(),
  preferredEnd: z.number().int().optional(),
  softDeadline: z.number().int().optional(),
  hardDeadline: z.number().int().optional(),
  estimatedMinutes: z.number().int().optional(),
  remainingMinutes: z.number().int().optional(),
  sessionMinutes: z.number().int().optional(),
  isSplittable: z.boolean().optional(),
  schedulingMode: z.enum(["manual", "suggested", "automatic"]).optional(),
});

const taskUpdateSchema = taskFields.partial().extend({ expectedVersion: z.number().int() });
const versionOnlySchema = z.object({ expectedVersion: z.number().int() });

function withVersionGuards<T>(fn: () => T) {
  try {
    return fn();
  } catch (err) {
    if (err instanceof NotFoundError) throw new HTTPException(404, { message: "Task not found" });
    if (err instanceof ConflictError) throw new HTTPException(409, { message: "Task was modified elsewhere" });
    throw err;
  }
}

export const tasksRoutes = new Hono()
  .use("*", requireSession)

  .get("/", (c) => c.json(listTasks()))

  .post("/", zValidator("json", taskFields), (c) => c.json(createTask(c.req.valid("json")), 201))

  .get("/:taskId", (c) => {
    const task = getTask(c.req.param("taskId"));
    if (!task) throw new HTTPException(404, { message: "Task not found" });
    return c.json(task);
  })

  .patch("/:taskId", zValidator("json", taskUpdateSchema), (c) => {
    const { expectedVersion, ...patch } = c.req.valid("json");
    return c.json(withVersionGuards(() => updateTask(c.req.param("taskId"), patch, expectedVersion)));
  })

  .post(
    "/:taskId/move",
    zValidator(
      "json",
      z.object({
        toState: z.enum(["active", "in_progress", "resolved"]),
        previousTaskId: z.string().optional(),
        nextTaskId: z.string().optional(),
        expectedVersion: z.number().int(),
      }),
    ),
    (c) => {
      const { expectedVersion, ...input } = c.req.valid("json");
      return c.json(withVersionGuards(() => moveTask(c.req.param("taskId"), { ...input, expectedVersion })));
    },
  )

  .post("/:taskId/start", zValidator("json", versionOnlySchema), (c) =>
    c.json(withVersionGuards(() => startTask(c.req.param("taskId"), c.req.valid("json").expectedVersion))),
  )

  .post("/:taskId/return-active", zValidator("json", versionOnlySchema), (c) =>
    c.json(withVersionGuards(() => returnToActive(c.req.param("taskId"), c.req.valid("json").expectedVersion))),
  )

  .post("/:taskId/resolve", zValidator("json", versionOnlySchema), (c) =>
    c.json(withVersionGuards(() => resolveTask(c.req.param("taskId"), c.req.valid("json").expectedVersion))),
  )

  .post("/:taskId/reopen", zValidator("json", versionOnlySchema), (c) =>
    c.json(withVersionGuards(() => reopenTask(c.req.param("taskId"), c.req.valid("json").expectedVersion))),
  )

  .post(
    "/:taskId/snooze",
    zValidator("json", versionOnlySchema.extend({ until: z.number().int() })),
    (c) => {
      const { expectedVersion, until } = c.req.valid("json");
      return c.json(withVersionGuards(() => snoozeTask(c.req.param("taskId"), expectedVersion, until)));
    },
  )

  .post(
    "/:taskId/block",
    zValidator("json", versionOnlySchema.extend({ reason: z.string().min(1) })),
    (c) => {
      const { expectedVersion, reason } = c.req.valid("json");
      return c.json(withVersionGuards(() => blockTask(c.req.param("taskId"), expectedVersion, reason)));
    },
  )

  .post("/:taskId/unblock", zValidator("json", versionOnlySchema), (c) =>
    c.json(withVersionGuards(() => unblockTask(c.req.param("taskId"), c.req.valid("json").expectedVersion))),
  );

export const boardRoutes = new Hono().use("*", requireSession).get("/", (c) => c.json(getBoard()));
