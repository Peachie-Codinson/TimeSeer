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

const iconProps = { size: 15, weight: "regular" as const };

/** A sidebar nav row. Omit `to` for pages that don't exist yet — shown muted and inert
 * rather than as a link that goes nowhere. */
function NavItem({ to, icon, label }: { to?: string; icon: ReactNode; label: string }) {
  const location = useLocation();

  if (!to) {
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

  if (location.pathname === to) {
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

export function AppSidebar() {
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
          <NavItem to="/" icon={<SunIcon {...iconProps} />} label="Today" />
          <NavItem to="/" icon={<CalendarBlankIcon {...iconProps} />} label="Calendar" />
          <NavItem to="/tasks" icon={<CheckSquareIcon {...iconProps} />} label="Tasks" />
          <NavItem icon={<span style={{ display: "inline-flex", width: 15 }} />} label="Upcoming" />
          <NavItem to="/focus" icon={<TargetIcon {...iconProps} />} label="Focus" />
        </div>
        <div className="nc-hr" style={{ height: 1, background: "var(--color-divider)", margin: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <NavItem to="/quotas" icon={<GaugeIcon {...iconProps} />} label="Quotas" />
          <NavItem to="/archive" icon={<ArchiveIcon {...iconProps} />} label="Archive" />
          <NavItem to="/areas" icon={<FoldersIcon {...iconProps} />} label="Areas" />
          <NavItem to="/settings" icon={<GearIcon {...iconProps} />} label="Settings" />
        </div>
      </div>
    </div>
  );
}
