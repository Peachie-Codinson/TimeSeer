import { defineConfig } from "drizzle-kit";
import { config } from "./src/config.ts";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: config.databasePath,
  },
});
