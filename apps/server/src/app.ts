import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { errorHandler } from "./middleware/errors.js";
import { requireTrustedOrigin } from "./middleware/csrf.js";
import { archiveRoutes } from "./modules/archive/routes.js";
import { areasRoutes } from "./modules/areas/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { calendarRoutes, eventsRoutes } from "./modules/calendar/routes.js";
import { dashboardRoutes } from "./modules/dashboard/routes.js";
import { healthRoutes } from "./modules/health/routes.js";
import { quotasRoutes } from "./modules/quotas/routes.js";
import { boardRoutes, tasksRoutes } from "./modules/tasks/routes.js";
import { workSessionsRoutes } from "./modules/work-sessions/routes.js";

const api = new Hono()
  .route("/health", healthRoutes)
  .route("/auth", authRoutes)
  .route("/dashboard", dashboardRoutes)
  .route("/calendar", calendarRoutes)
  .route("/events", eventsRoutes)
  .route("/areas", areasRoutes)
  .route("/tasks", tasksRoutes)
  .route("/board", boardRoutes)
  .route("/work-sessions", workSessionsRoutes)
  .route("/archive", archiveRoutes)
  .route("/quotas", quotasRoutes);

const app = new Hono();

app.use("*", logger());
app.onError(errorHandler);

app.use("/api/*", requireTrustedOrigin);
app.route("/api/v1", api);

// Serve the compiled React web application for all other routes.
app.use("/*", serveStatic({ root: "./public" }));
app.use("/*", serveStatic({ path: "./public/index.html" }));

export type ApiRoutes = typeof api;
export { app };
