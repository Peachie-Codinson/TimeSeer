import { Hono } from "hono";
import { requireSession } from "../../middleware/auth.js";
import { computeNotifications } from "./service.js";

export const notificationsRoutes = new Hono()
  .use("*", requireSession)
  .get("/", (c) => c.json(computeNotifications()));
