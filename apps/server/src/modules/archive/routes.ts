import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requireSession } from "../../middleware/auth.js";
import { NotFoundError, flushArchive, listArchivedTasks, permanentlyDeleteTask, previewFlush, restoreTask } from "./service.js";

export const archiveRoutes = new Hono()
  .use("*", requireSession)

  .get("/", (c) => c.json(listArchivedTasks()))

  .post("/flush-preview", (c) => c.json(previewFlush()))

  .post("/flush", async (c) => {
    // Body is optional: omitted for "Immolate all" (age-eligible tasks), or
    // { taskIds: [...] } for "Immolate selected" from the board.
    let taskIds: string[] | undefined;
    try {
      const body: unknown = await c.req.json();
      if (body && typeof body === "object" && "taskIds" in body && Array.isArray(body.taskIds)) {
        taskIds = body.taskIds as string[];
      }
    } catch {
      // no JSON body sent
    }
    return c.json(flushArchive(taskIds));
  })

  .post("/tasks/:taskId/restore", (c) => {
    try {
      return c.json(restoreTask(c.req.param("taskId")));
    } catch (err) {
      if (err instanceof NotFoundError) throw new HTTPException(404, { message: "Archived task not found" });
      throw err;
    }
  })

  .delete("/tasks/:taskId", (c) => {
    try {
      permanentlyDeleteTask(c.req.param("taskId"));
    } catch (err) {
      if (err instanceof NotFoundError) throw new HTTPException(404, { message: "Archived task not found" });
      throw err;
    }
    return c.body(null, 204);
  });
