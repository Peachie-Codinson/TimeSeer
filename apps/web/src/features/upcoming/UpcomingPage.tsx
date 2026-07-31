import {
  BookOpenIcon,
  ChalkboardTeacherIcon,
  FlagIcon,
  FlaskIcon,
  FolderSimpleIcon,
  TimerIcon,
  UserIcon,
  VideoCameraIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { AppSidebar } from "../../components/AppSidebar";
import { formatDuration } from "../../lib/format";
import "../../styles/nocturne.css";
import { type Area, fetchAreas } from "../areas/api";
import { fetchCalendarRange } from "../calendar/api";
import { taskBadges } from "../tasks/badges";
import { fetchTasks } from "../tasks/api";
import { TaskDetailDrawer } from "../tasks/TaskDetailDrawer";
import type { Task } from "../tasks/types";

type Range = "today" | "week" | "month";
const RANGE_DAYS: Record<Range, number> = { today: 1, week: 7, month: 30 };

const KIND_ICON: Record<Area["kind"], ReactNode> = {
  course: <BookOpenIcon size={13} />,
  research: <FlaskIcon size={13} />,
  teaching: <ChalkboardTeacherIcon size={13} />,
  administration: <FolderSimpleIcon size={13} />,
  personal: <UserIcon size={13} />,
  other: <FolderSimpleIcon size={13} />,
};

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtClockTime(ms: number): string {
  const d = new Date(ms);
  const opts: Intl.DateTimeFormatOptions = d.getMinutes() === 0 ? { hour: "numeric" } : { hour: "numeric", minute: "2-digit" };
  return d.toLocaleTimeString(undefined, opts);
}

function fmtGroupLabel(ms: number): string {
  const d = new Date(ms);
  const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
  const monthDay = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${weekday}, ${monthDay}`;
}

interface Row {
  key: string;
  dayKey: string;
  dateMs: number;
  timeMs: number;
  timeLabel: string;
  icon: ReactNode;
  iconColor: string;
  title: string;
  subLabel: string;
  hasRisk: boolean;
  riskLabel: string;
  areaName: string;
  onClick: () => void;
}

export function UpcomingPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>("week");
  const [areaFilters, setAreaFilters] = useState<Set<string> | null>(null); // null = all areas
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { data: areas = [] } = useQuery({ queryKey: ["areas"], queryFn: fetchAreas });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });

  const rangeStart = startOfToday();
  const rangeEnd = rangeStart + RANGE_DAYS[range] * 24 * 60 * 60 * 1000;

  const { data: calendar } = useQuery({
    queryKey: ["calendar", rangeStart, rangeEnd],
    queryFn: () => fetchCalendarRange(rangeStart, rangeEnd),
  });
  const events = calendar?.events ?? [];
  const workSessions = calendar?.workSessions ?? [];

  const activeAreaIds = areaFilters ?? new Set(areas.map((a) => a.id));
  const areaById = new Map(areas.map((a) => [a.id, a]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  const toggleArea = (id: string) => {
    setAreaFilters((cur) => {
      const next = new Set(cur ?? areas.map((a) => a.id));
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rows: Row[] = [];

  for (const task of tasks) {
    if (task.state === "resolved" || task.state === "archived") continue;
    if (task.hardDeadline === null) continue;
    if (task.hardDeadline < Date.now() || task.hardDeadline > rangeEnd) continue;
    if (task.areaId && !activeAreaIds.has(task.areaId)) continue;
    const area = task.areaId ? areaById.get(task.areaId) : undefined;
    const badges = taskBadges(task);
    const risk = badges.find((b) => b.label === "Overdue" || b.label === "Due today");
    const d = new Date(task.hardDeadline);
    rows.push({
      key: `task-${task.id}`,
      dayKey: d.toDateString(),
      dateMs: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
      timeMs: task.hardDeadline,
      timeLabel: fmtClockTime(task.hardDeadline),
      icon: <FlagIcon size={14} />,
      iconColor: "var(--color-accent)",
      title: task.title,
      subLabel: task.remainingMinutes !== null ? `${formatDuration(task.remainingMinutes)} remaining` : "",
      hasRisk: !!risk,
      riskLabel: risk?.label ?? "",
      areaName: area?.name ?? "No area",
      onClick: () => setSelectedTask(task),
    });
  }

  for (const occ of events) {
    if (occ.areaId && !activeAreaIds.has(occ.areaId)) continue;
    const area = occ.areaId ? areaById.get(occ.areaId) : undefined;
    const d = new Date(occ.startsAt);
    rows.push({
      key: `event-${occ.id}-${occ.occurrenceStart}`,
      dayKey: d.toDateString(),
      dateMs: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
      timeMs: occ.startsAt,
      timeLabel: fmtClockTime(occ.startsAt),
      icon: <VideoCameraIcon size={14} />,
      iconColor: "var(--color-accent)",
      title: occ.title,
      subLabel: `${fmtClockTime(occ.startsAt)} – ${fmtClockTime(occ.endsAt)}${occ.locationName ? ` · ${occ.locationName}` : ""}`,
      hasRisk: false,
      riskLabel: "",
      areaName: area?.name ?? "No area",
      onClick: () => navigate("/"),
    });
  }

  for (const session of workSessions) {
    const task = taskById.get(session.taskId);
    if (task?.areaId && !activeAreaIds.has(task.areaId)) continue;
    const area = task?.areaId ? areaById.get(task.areaId) : undefined;
    const d = new Date(session.startsAt);
    rows.push({
      key: `session-${session.id}`,
      dayKey: d.toDateString(),
      dateMs: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
      timeMs: session.startsAt,
      timeLabel: fmtClockTime(session.startsAt),
      icon: <TimerIcon size={14} />,
      iconColor: "var(--color-accent)",
      title: task?.title ?? "Work session",
      subLabel: `${fmtClockTime(session.startsAt)} – ${fmtClockTime(session.endsAt)}`,
      hasRisk: false,
      riskLabel: "",
      areaName: area?.name ?? "No area",
      onClick: () => navigate("/"),
    });
  }

  rows.sort((a, b) => a.timeMs - b.timeMs);

  const groups = new Map<string, { dateMs: number; rows: Row[] }>();
  for (const row of rows) {
    const g = groups.get(row.dayKey) ?? { dateMs: row.dateMs, rows: [] };
    g.rows.push(row);
    groups.set(row.dayKey, g);
  }
  const orderedGroups = Array.from(groups.values()).sort((a, b) => a.dateMs - b.dateMs);
  const today = new Date();

  return (
    <div className="nc-shell" style={{ height: "100vh", width: "100vw", display: "flex", overflow: "hidden" }}>
      <AppSidebar />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div
          style={{
            height: "auto",
            minHeight: 52,
            flex: "none",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            rowGap: 6,
            borderBottom: "1px solid var(--color-divider)",
            padding: "8px var(--space-6)",
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 15 }}>Upcoming</div>
          <div className="nc-seg" style={{ marginLeft: "auto" }}>
            {(["today", "week", "month"] as Range[]).map((r) => (
              <label key={r} className="nc-seg-opt" style={range === r ? { color: "var(--color-accent)" } : undefined}>
                <input type="radio" name="range" checked={range === r} onChange={() => setRange(r)} />
                {r === "today" ? "Today" : r === "week" ? "This week" : "This month"}
              </label>
            ))}
          </div>
        </div>

        <div
          style={{
            minHeight: 48,
            flex: "none",
            display: "flex",
            flexWrap: "wrap",
            rowGap: 6,
            alignItems: "center",
            gap: 8,
            padding: "8px var(--space-6)",
            borderBottom: "1px solid var(--color-divider)",
          }}
        >
          {areas.map((a) => (
            <div
              key={a.id}
              className={`nc-tag ${activeAreaIds.has(a.id) ? "nc-tag-accent" : "nc-tag-outline"}`}
              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              onClick={() => toggleArea(a.id)}
            >
              {KIND_ICON[a.kind]}
              {a.name}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "8px var(--space-6) 40px" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            {orderedGroups.length === 0 && (
              <div style={{ padding: "40px 4px", textAlign: "center", color: "color-mix(in srgb, var(--color-text) 45%, transparent)", fontSize: 13.5 }}>
                Nothing upcoming in this range.
              </div>
            )}
            {orderedGroups.map((grp) => {
              const grpDate = new Date(grp.dateMs);
              const isToday = sameDay(grpDate, today);
              return (
                <div key={grp.dateMs}>
                  <div
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "var(--color-bg)",
                      padding: "14px 4px 8px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "color-mix(in srgb, var(--color-text) 55%, transparent)",
                      borderBottom: "1px solid var(--color-divider)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {isToday ? "Today" : fmtGroupLabel(grp.dateMs)}
                    {isToday && <div className="nc-tag nc-tag-accent">Today</div>}
                  </div>
                  {grp.rows.map((row) => (
                    <div
                      key={row.key}
                      className="nc-hover"
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: "1px solid var(--color-divider)", cursor: "pointer" }}
                      onClick={row.onClick}
                    >
                      <div style={{ width: 64, flex: "none", fontSize: 11.5, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                        {row.timeLabel}
                      </div>
                      <div style={{ color: row.iconColor, flex: "none", display: "flex" }}>{row.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {row.title}
                        </div>
                        <div style={{ fontSize: 11, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>{row.subLabel}</div>
                      </div>
                      {row.hasRisk && (
                        <div className="nc-tag nc-tag-outline" style={{ color: "var(--color-accent-300)", borderColor: "color-mix(in srgb, var(--color-accent) 40%, transparent)" }}>
                          {row.riskLabel}
                        </div>
                      )}
                      <div className="nc-tag nc-tag-neutral">{row.areaName}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          areas={areas}
          onClose={() => setSelectedTask(null)}
          onChanged={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
