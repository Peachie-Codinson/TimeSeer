import { createMiddleware } from "hono/factory";
import { config } from "../config.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Rejects cross-origin mutating requests. Cookie auth alone doesn't stop a
 * third-party page from issuing a POST with the browser's cookies attached,
 * so mutating requests must carry an Origin header that matches this deployment.
 */
export const requireTrustedOrigin = createMiddleware(async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) {
    return next();
  }

  const origin = c.req.header("Origin");
  if (!origin || !config.allowedOrigins.includes(origin)) {
    return c.json({ error: "Origin not allowed" }, 403);
  }

  await next();
});
