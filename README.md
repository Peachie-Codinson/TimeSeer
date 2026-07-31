# Private Academic Planner

A lightweight single-user academic planner: server-authoritative modular monolith on SQLite,
with a combined calendar/task dashboard. See the full technical specification for the target
architecture across all phases.

## Status

This repository currently implements **Stage 1: Foundation**, **Stage 2: Minimal
Authentication**, **Stage 3: Combined Dashboard and Calendar**, **Stage 4: Task
Management**, **Stage 5: Sessions, Archive, and Quotas**, **Stage 6: Basic Scheduling
and Notifications**, and most of **Stage 7: Desktop Shell and Polish** — including a
full pass to bring the whole web UI onto the "Nocturne" dark design system produced by
the project's Claude Design handoff (see below):

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
  flush that creates an archive batch (tagged `manual` or `weekly_flush`, per which
  triggered it) and moves tasks to `archived`, restore back to `resolved`, and permanent
  deletion (cascading work sessions/resolutions). The Task Board's Resolved column has a
  single "Immolate" button (archives everything currently age-eligible, no confirmation —
  per the design's later iterations, which dropped per-card selection and dialogs in favor
  of one calm action with a burn animation); the `/archive` route is its own page — a table
  with area/source filters, a weekly-flush batch-info drawer, restore, and a confirmed
  permanent-delete
- Quotas: CRUD plus `/quotas` (a full management page — table with a floor-based tiered
  progress bar, a pace-vs-plan tag, and a real per-quota History disclosure computed by
  walking previous periods, not synthetic data) and a compact daily summary
  (completed/scheduled/target/remaining minutes) computed from today's work sessions,
  editable inline from the dashboard's Quota Summary
- `packages/scheduler`: a pure, unit-tested TypeScript greedy-heuristic engine (spec 14.1) —
  sorts tasks by time-gate/deadline/overdue/priority/position, computes free time against
  fixed events, locked/active work sessions, working hours, and the daily quota cap, then
  proposes sessions with a short explanation per placement, or explains why a task couldn't
  be scheduled. `POST /api/v1/schedule/preview` returns proposals for review; `POST
  /api/v1/schedule/apply` turns the accepted subset into real work sessions; `GET
  /api/v1/schedule/risks` surfaces overdue/insufficient-time warnings. A "Suggest schedule"
  button on the calendar opens a preview with per-proposal checkboxes and an Apply action
- A persistent job runner (spec 13.7): polls `scheduled_jobs` every 30s, retries failures
  with exponential backoff, and catches up on overdue jobs immediately on boot. Seeds a
  recurring weekly archive-flush job, so Stage 5's archive now actually runs automatically
  instead of only via manual Immolate
- In-app notifications: `GET /api/v1/notifications` computes reminders on read (imminent
  events/sessions, approaching/overdue deadlines, time-gates opening or closing, a completed
  weekly archive flush) — no fired-notification table to maintain. A bell icon polls this
  every 60s, shows a dropdown, and fires permission-gated Browser Notification API alerts for
  newly-seen items
- Areas: `/areas` — expandable cards (click to reveal the area's tasks), a 14-swatch +
  native color-wheel picker for each area's calendar/task-card color, rename, and archive
  (soft-hide via `active:false`)
- Focus: `/focus` shows the task with a currently in-progress work session (via a new
  `GET /work-sessions/active`) with a live mm:ss timer seeded from the session's real start
  time, Pause/Resume (a local-only freeze — there's no "paused" session status), Finish/Mark
  Partial (report real elapsed minutes), Resolve, Report Blocker, and a distraction-free
  "Minimal mode"
- Task Detail drawer (opened from the board or Upcoming): a tabbed Overview / Planning /
  Calendar / Activity view. Calendar and Activity are backed by two new endpoints,
  `GET /tasks/:taskId/sessions` and `GET /tasks/:taskId/activity` (the latter surfacing the
  `activity_log` rows every task transition already wrote, previously not exposed via the API)
- Upcoming: `/upcoming` — a chronological agenda merging tasks-with-a-deadline, calendar
  events, and scheduled work sessions, grouped by day, with a Today/This week/This month
  range and per-area filter chips
- Settings: `/settings` wires up the sections that have a real backend home today (Security:
  change password, list/revoke device sessions, logout; Integrations: the Canvas "coming
  later" placeholder) and marks General/Task Defaults/Notifications/Appearance as explicitly
  not-yet-implemented rather than shipping controls with no `owner_settings` table to persist
  them
- The whole web UI (Dashboard/Calendar, Task Board, Task Detail, Archive, Quotas, Areas,
  Focus, Settings, Upcoming) runs on "Nocturne", the dark design system from the project's
  Claude Design handoff — shared tokens/components in `apps/web/src/styles/nocturne.css`,
  a shared `AppSidebar`, and FullCalendar's own theme variables remapped to match

Not yet implemented: the Canvas integration stub, and in-app controls for backup/restore/
export (those already exist as CLI scripts under `apps/server/src/scripts` and
`infrastructure/scripts`, just not wired into Settings). The Tauri desktop shell scaffold
exists under `apps/desktop`.

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
