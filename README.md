# Private Academic Planner

A lightweight single-user academic planner: server-authoritative modular monolith on SQLite,
with a combined calendar/task dashboard. See the full technical specification for the target
architecture across all phases.

## Status

This repository currently implements **Stage 1: Foundation**, **Stage 2: Minimal
Authentication**, **Stage 3: Combined Dashboard and Calendar**, **Stage 4: Task
Management**, and **Stage 5: Sessions, Archive, and Quotas**:

- pnpm workspace (`apps/server`, `apps/web`)
- Hono API server on Node, with `/api/v1/health/live` and `/api/v1/health/ready`
- SQLite via `better-sqlite3` + Drizzle ORM, with the core schema (owners, sessions, areas,
  tasks, events, work sessions, quotas, archive, scheduled jobs, setup tokens) and WAL
  pragmas configured
- React + Vite web app, served by the Node app in production, using the Hono RPC client for
  typed API calls and TanStack Query for server state
- Docker Compose (`app` + `caddy`) and a Caddyfile for TLS termination
- A `bootstrap.sh` script to build, start the stack, and print the one-time owner setup URL
- Single-owner auth: one-time setup token claim, argon2 password hashing, long-lived session
  cookies, login throttling/lockout, session listing and revocation, password-change session
  invalidation, and origin validation on mutating API requests
- A `reset-owner` CLI script for out-of-band password resets
- Areas (courses/projects/etc.) with CRUD, used to color-code calendar events
- Fixed Events: full CRUD with optimistic-concurrency versioning, RRULE-based recurrence
  (via `rrule`) with per-occurrence move/cancel exceptions, and a `GET /api/v1/calendar`
  range-query endpoint that expands recurrence and applies exceptions server-side
- The combined landing page: mini-calendar + areas nav on the left, a Google Calendar-style
  view (month/week/day/agenda, current-time line, working-hour highlighting, drag, resize,
  click/drag-to-create, quick-create popover, full editor, keyboard-safe delete with
  occurrence-vs-series confirmation, undo-after-move toast, remembered view/date) in the
  center, and a current-task side panel on the right sourced from `GET /api/v1/dashboard`
- Tasks: full lifecycle (create with issue-number allocation, start, resolve, reopen, return-
  to-active, snooze, block/unblock) with optimistic-concurrency versioning, plus board-drag
  reordering using integer positions spaced by 1024 (renumbering a column only when a gap
  closes, per spec 8.3)
- The `/tasks` board (Active / In Progress / Resolved) with dnd-kit drag-and-drop within and
  across columns, quick-add, a task detail drawer with the full edit form and lifecycle
  actions, and condition badges (Blocked, Overdue, Due today, Time-gated, external source)
- The dashboard's In Progress / Urgent & Time-Gated / Active Next sections render real task
  data from `GET /api/v1/dashboard`, with Start/Resolve/Return-to-Active/Snooze actions wired
  to the API; task-to-calendar drag (via FullCalendar's external `Draggable`) creates a work
  session that renders as an outlined "Work Session" chip alongside Fixed Events
- Work sessions: full lifecycle (start, complete, partial completion with actual minutes,
  skip, lock/unlock), with completion/partial updating the task's `remainingMinutes` and
  `progressPercent`. Clicking a work session chip on the calendar opens quick actions.
  Resolving a task closes its in-progress session and cancels still-planned future ones
  (spec 13.5). The dashboard's "Now" section shows tasks with a currently in-progress session
- Archive: age-based eligibility (resolved 7+ days, not archive-protected), a transactional
  flush that creates an archive batch and moves tasks to `archived`, restore back to
  `resolved`, and permanent deletion (cascading work sessions/resolutions). The `/tasks` board
  supports multi-select on the Resolved column with "Immolate selected" (bypasses the age
  check for explicitly chosen tasks) and "Immolate all" (age-eligible only); a `/archive`
  route lists archived tasks with restore/permanent-delete. The persistent scheduled-job
  runner that would fire this automatically on a weekly cron is Stage 6 infrastructure —
  flushing is manually triggered via Immolate for now
- Quotas: CRUD plus a compact daily summary (completed/scheduled/target/remaining minutes)
  computed from today's work sessions, editable inline from the dashboard's Quota Summary

Not yet implemented: the scheduling engine, notifications, persistent scheduled jobs (the
weekly auto-archive cron), the Tauri desktop shell, and the Canvas integration stub. These
land in later stages.

## Development

```bash
corepack enable
pnpm install

# Run the API server (http://localhost:3000)
pnpm dev:server

# Run the web app (http://localhost:5173, proxies /api to :3000)
pnpm dev:web
```

### Database

```bash
# Generate a migration from schema.ts changes
pnpm db:generate

# Apply pending migrations
pnpm db:migrate
```

The SQLite database is written to `DATABASE_PATH` (defaults to `./data/planner.db` locally,
`/data/planner.db` in the container).

## Deployment

```bash
./infrastructure/scripts/bootstrap.sh
```

Builds and starts the `app` and `caddy` containers via Docker Compose. All persistent state
lives in the `planner_data` volume (SQLite database + attachments).
