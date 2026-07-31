import { and, eq, lte } from "drizzle-orm";
import { db } from "../db/connection.js";
import { scheduledJobs } from "../db/schema.js";
import { flushArchive } from "../modules/archive/service.js";

const POLL_INTERVAL_MS = 30_000;
const MAX_ATTEMPTS = 5;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const LOCK_DURATION_MS = 60_000;

type JobRow = typeof scheduledJobs.$inferSelect;

const handlers: Record<string, (payload: unknown) => void> = {
  "archive-flush": () => {
    flushArchive(undefined, "weekly_flush");
  },
};

function backoffMs(attempts: number): number {
  return Math.min(60_000 * 2 ** attempts, 24 * 60 * 60 * 1000);
}

function runDueJobs() {
  const now = Date.now();
  const due = db
    .select()
    .from(scheduledJobs)
    .where(and(lte(scheduledJobs.runAt, now), eq(scheduledJobs.status, "pending")))
    .all();

  for (const job of due) {
    processJob(job);
  }
}

function processJob(job: JobRow) {
  const now = Date.now();
  const attempts = job.attempts + 1;

  db.update(scheduledJobs)
    .set({ status: "running", attempts, lockedUntil: now + LOCK_DURATION_MS })
    .where(eq(scheduledJobs.id, job.id))
    .run();

  try {
    const handler = handlers[job.kind];
    if (!handler) throw new Error(`No handler registered for job kind "${job.kind}"`);
    handler(job.payloadJson ? JSON.parse(job.payloadJson) : undefined);

    db.update(scheduledJobs)
      .set({ status: "completed", completedAt: Date.now() })
      .where(eq(scheduledJobs.id, job.id))
      .run();

    if (job.kind === "archive-flush") {
      scheduleNext("archive-flush", Date.now() + WEEK_MS);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (attempts >= MAX_ATTEMPTS) {
      db.update(scheduledJobs).set({ status: "failed", lastError: message }).where(eq(scheduledJobs.id, job.id)).run();
    } else {
      db.update(scheduledJobs)
        .set({ status: "pending", runAt: Date.now() + backoffMs(attempts), lastError: message })
        .where(eq(scheduledJobs.id, job.id))
        .run();
    }
  }
}

function scheduleNext(kind: string, runAt: number) {
  db.insert(scheduledJobs).values({ kind, runAt, status: "pending", createdAt: Date.now() }).run();
}

function ensureWeeklyArchiveFlushSeeded() {
  const existing = db
    .select({ id: scheduledJobs.id })
    .from(scheduledJobs)
    .where(and(eq(scheduledJobs.kind, "archive-flush"), eq(scheduledJobs.status, "pending")))
    .get();
  if (!existing) {
    scheduleNext("archive-flush", Date.now() + WEEK_MS);
  }
}

/**
 * Starts the persistent job runner (spec 13.7): polls scheduled_jobs every 30s, retries
 * failures with exponential backoff, and catches up on overdue jobs immediately on boot
 * (e.g. after the server was down past a job's runAt).
 */
export function startJobRunner() {
  ensureWeeklyArchiveFlushSeeded();
  runDueJobs();
  setInterval(runDueJobs, POLL_INTERVAL_MS);
}
