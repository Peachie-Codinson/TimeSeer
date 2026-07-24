import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
};

// --- 10.1 Owner and Sessions ---------------------------------------------

export const owners = sqliteTable("owners", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  timezone: text("timezone").notNull(),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: integer("locked_until"),
  ...timestamps,
});

export const sessions = sqliteTable("sessions", {
  id: id(),
  tokenHash: text("token_hash").notNull().unique(),
  deviceName: text("device_name"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  revokedAt: integer("revoked_at"),
});

// A one-time token minted by the bootstrap script so the owner can claim
// the singleton account before any password exists.
export const setupTokens = sqliteTable("setup_tokens", {
  id: id(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
  consumedAt: integer("consumed_at"),
  createdAt: integer("created_at").notNull(),
});

// --- 10.2 Areas ------------------------------------------------------------

export const areas = sqliteTable("areas", {
  id: id(),
  name: text("name").notNull(),
  kind: text("kind", {
    enum: ["course", "research", "teaching", "administration", "personal", "other"],
  }).notNull(),
  color: text("color"),
  icon: text("icon"),
  startsAt: integer("starts_at"),
  endsAt: integer("ends_at"),
  active: integer("active").notNull().default(1),
  externalSource: text("external_source"),
  externalId: text("external_id"),
  ...timestamps,
});

// --- 10.3 Tasks --------------------------------------------------------------

export const tasks = sqliteTable(
  "tasks",
  {
    id: id(),
    issueNumber: integer("issue_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    state: text("state", {
      enum: ["active", "in_progress", "resolved", "archived"],
    }).notNull(),
    areaId: text("area_id").references(() => areas.id),
    priority: integer("priority").notNull().default(0),
    position: integer("position").notNull(),
    earliestStart: integer("earliest_start"),
    preferredStart: integer("preferred_start"),
    preferredEnd: integer("preferred_end"),
    softDeadline: integer("soft_deadline"),
    hardDeadline: integer("hard_deadline"),
    estimatedMinutes: integer("estimated_minutes"),
    remainingMinutes: integer("remaining_minutes"),
    sessionMinutes: integer("session_minutes"),
    isSplittable: integer("is_splittable").notNull().default(1),
    schedulingMode: text("scheduling_mode", {
      enum: ["manual", "suggested", "automatic"],
    })
      .notNull()
      .default("suggested"),
    progressPercent: integer("progress_percent").notNull().default(0),
    blockedReason: text("blocked_reason"),
    archiveProtected: integer("archive_protected").notNull().default(0),
    resolvedAt: integer("resolved_at"),
    archivedAt: integer("archived_at"),
    archiveBatchId: text("archive_batch_id"),
    externalSource: text("external_source"),
    externalId: text("external_id"),
    externalUrl: text("external_url"),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [uniqueIndex("tasks_issue_number_unique").on(table.issueNumber)],
);

// --- 10.5 Events -------------------------------------------------------------

export const events = sqliteTable("events", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  areaId: text("area_id").references(() => areas.id),
  startsAt: integer("starts_at").notNull(),
  endsAt: integer("ends_at").notNull(),
  timezone: text("timezone").notNull(),
  allDay: integer("all_day").notNull().default(0),
  recurrenceRule: text("recurrence_rule"),
  locationName: text("location_name"),
  locationUrl: text("location_url"),
  meetingUrl: text("meeting_url"),
  travelMinutes: integer("travel_minutes"),
  preparationMinutes: integer("preparation_minutes"),
  locked: integer("locked").notNull().default(1),
  externalSource: text("external_source"),
  externalId: text("external_id"),
  version: integer("version").notNull().default(1),
  ...timestamps,
});

export const eventExceptions = sqliteTable("event_exceptions", {
  id: id(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  originalStart: integer("original_start").notNull(),
  kind: text("kind", { enum: ["cancelled", "moved", "modified"] }).notNull(),
  replacementStart: integer("replacement_start"),
  replacementEnd: integer("replacement_end"),
  overrideJson: text("override_json"),
});

// --- 10.6 Work Sessions -------------------------------------------------------

export const workSessions = sqliteTable("work_sessions", {
  id: id(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id),
  startsAt: integer("starts_at").notNull(),
  endsAt: integer("ends_at").notNull(),
  plannedMinutes: integer("planned_minutes").notNull(),
  actualMinutes: integer("actual_minutes"),
  status: text("status", {
    enum: ["planned", "in_progress", "completed", "partial", "skipped", "cancelled"],
  }).notNull(),
  locked: integer("locked").notNull().default(0),
  automaticallyAdded: integer("automatically_added").notNull().default(0),
  notes: text("notes"),
  version: integer("version").notNull().default(1),
  ...timestamps,
});

// --- 10.7 Quotas ---------------------------------------------------------------

export const quotas = sqliteTable("quotas", {
  id: id(),
  scopeType: text("scope_type").notNull(),
  scopeId: text("scope_id"),
  period: text("period").notNull(),
  weekday: integer("weekday"),
  minimumMinutes: integer("minimum_minutes"),
  targetMinutes: integer("target_minutes"),
  maximumMinutes: integer("maximum_minutes"),
  active: integer("active").notNull().default(1),
});

// --- 10.8 Archive and Activity ---------------------------------------------------

export const archiveBatches = sqliteTable("archive_batches", {
  id: id(),
  createdAt: integer("created_at").notNull(),
  taskCount: integer("task_count").notNull().default(0),
});

export const taskResolutions = sqliteTable("task_resolutions", {
  id: id(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id),
  resolvedAt: integer("resolved_at").notNull(),
  notes: text("notes"),
});

export const activityLog = sqliteTable("activity_log", {
  id: id(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  detailJson: text("detail_json"),
  createdAt: integer("created_at").notNull(),
});

// --- 10.9 Persistent Scheduled Jobs ------------------------------------------------

export const scheduledJobs = sqliteTable("scheduled_jobs", {
  id: id(),
  kind: text("kind").notNull(),
  runAt: integer("run_at").notNull(),
  payloadJson: text("payload_json"),
  status: text("status", {
    enum: ["pending", "running", "completed", "failed"],
  }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  lockedUntil: integer("locked_until"),
  lastError: text("last_error"),
  createdAt: integer("created_at").notNull(),
  completedAt: integer("completed_at"),
});
