import {
  ArchiveIcon,
  CalendarBlankIcon,
  CheckSquareIcon,
  FoldersIcon,
  GaugeIcon,
  GearIcon,
  GraduationCapIcon,
  SunIcon,
  TargetIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";

function NavLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="nc-hover flex items-center gap-3 rounded-[var(--radius-md)] px-[9px] py-[7px]"
      style={{ color: "var(--color-text)" }}
    >
      {icon}
      <div style={{ fontSize: 13 }}>{label}</div>
    </Link>
  );
}

function NavCurrent({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-[var(--radius-md)] px-[9px] py-[7px]"
      style={{ background: "color-mix(in srgb, var(--color-accent) 14%, transparent)", color: "var(--color-accent)", fontWeight: 600 }}
    >
      {icon}
      <div style={{ fontSize: 13 }}>{label}</div>
    </div>
  );
}

function NavInert({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-[var(--radius-md)] px-[9px] py-[7px]"
      style={{ color: "color-mix(in srgb, var(--color-text) 40%, transparent)", cursor: "default" }}
      title="Not built yet"
    >
      {icon}
      <div style={{ fontSize: 13 }}>{label}</div>
    </div>
  );
}

const iconProps = { size: 15, weight: "regular" as const };

export function AppSidebar() {
  const location = useLocation();

  return (
    <div
      style={{
        width: 216,
        flex: "none",
        background: "var(--color-neutral-900)",
        borderRight: "1px solid var(--color-divider)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 52,
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "0 var(--space-4)",
          borderBottom: "1px solid var(--color-divider)",
        }}
      >
        <GraduationCapIcon size={18} weight="regular" color="var(--color-accent)" />
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: "var(--font-heading-weight)" as unknown as number, fontSize: 14 }}>
          Planner
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <NavLink to="/" icon={<SunIcon {...iconProps} />} label="Today" />
          <NavLink to="/" icon={<CalendarBlankIcon {...iconProps} />} label="Calendar" />
          {location.pathname === "/tasks" ? (
            <NavCurrent icon={<CheckSquareIcon {...iconProps} />} label="Tasks" />
          ) : (
            <NavLink to="/tasks" icon={<CheckSquareIcon {...iconProps} />} label="Tasks" />
          )}
          <NavInert icon={<span style={{ display: "inline-flex", width: 15 }} />} label="Upcoming" />
          <NavInert icon={<TargetIcon {...iconProps} />} label="Focus" />
        </div>
        <div className="nc-hr" style={{ height: 1, background: "var(--color-divider)", margin: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <NavInert icon={<GaugeIcon {...iconProps} />} label="Quotas" />
          {location.pathname === "/archive" ? (
            <NavCurrent icon={<ArchiveIcon {...iconProps} />} label="Archive" />
          ) : (
            <NavLink to="/archive" icon={<ArchiveIcon {...iconProps} />} label="Archive" />
          )}
          <NavInert icon={<FoldersIcon {...iconProps} />} label="Areas" />
          <NavInert icon={<GearIcon {...iconProps} />} label="Settings" />
        </div>
      </div>
    </div>
  );
}
