const required = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const nodeEnv = process.env.NODE_ENV ?? "development";
const publicOrigin = required("PUBLIC_ORIGIN", "http://localhost:3000");

export const config = {
  nodeEnv,
  port: Number(process.env.PORT ?? 3000),
  databasePath: required("DATABASE_PATH", "./data/planner.db"),
  attachmentsDir: required("ATTACHMENTS_DIR", "./data/attachments"),
  publicOrigin,
  // The Vite dev server runs on its own origin and proxies /api to this
  // server, so browser-issued Origin headers show the dev-server origin.
  allowedOrigins:
    nodeEnv === "production" ? [publicOrigin] : [publicOrigin, "http://localhost:5173"],
  sessionCookieName: "planner_session",
  sessionMaxAgeDays: 180,
} as const;
