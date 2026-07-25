import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { config } from "./config.js";
import { startJobRunner } from "./jobs/runner.js";

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Server listening on http://localhost:${info.port}`);
});

startJobRunner();
