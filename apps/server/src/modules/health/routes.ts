import { Hono } from "hono";
import { sqlite } from "../../db/connection.js";

export const healthRoutes = new Hono()
  .get("/live", (c) => c.json({ status: "ok" }))
  .get("/ready", (c) => {
    try {
      sqlite.prepare("SELECT 1").get();
      return c.json({ status: "ok" });
    } catch {
      return c.json({ status: "unavailable" }, 503);
    }
  });
