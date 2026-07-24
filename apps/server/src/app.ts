import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { errorHandler } from "./middleware/errors.js";
import { requireTrustedOrigin } from "./middleware/csrf.js";
import { authRoutes } from "./modules/auth/routes.js";
import { healthRoutes } from "./modules/health/routes.js";

const api = new Hono().route("/health", healthRoutes).route("/auth", authRoutes);

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
