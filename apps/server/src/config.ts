const required = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  databasePath: required("DATABASE_PATH", "./data/planner.db"),
  attachmentsDir: required("ATTACHMENTS_DIR", "./data/attachments"),
  publicOrigin: required("PUBLIC_ORIGIN", "http://localhost:3000"),
  sessionCookieName: "planner_session",
  sessionMaxAgeDays: 180,
} as const;
