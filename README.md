# Private Academic Planner

A lightweight single-user academic planner: server-authoritative modular monolith on SQLite,
with a combined calendar/task dashboard. See the full technical specification for the target
architecture across all phases.

## Status

This repository currently implements **Stage 1: Foundation**, **Stage 2: Minimal
Authentication**, **Stage 3: Combined Dashboard and Calendar**, and **Stage 4: Task
Management**:

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
- A minimal work-sessions slice (create only — the full start/complete/partial/skip lifecycle
  is Stage 5) so task-to-calendar drag works: dragging an Active Next card from the dashboard
  panel onto the calendar (via FullCalendar's external `Draggable`) creates a work session,
  which renders as an outlined "Work Session" chip alongside Fixed Events
- The dashboard's In Progress / Urgent & Time-Gated / Active Next sections now render real
  task data from `GET /api/v1/dashboard`, with Start/Resolve/Return-to-Active/Snooze actions
  wired to the API; quota summary and the "Now" section stay empty-state until quotas
  (Stage 5) and a real work-session lifecycle exist

Not yet implemented: archive flushing, quotas, the scheduling engine, notifications, the Tauri
desktop shell, and the Canvas integration stub. These land in later stages.

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
