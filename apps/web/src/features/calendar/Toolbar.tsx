import { MagnifyingGlassIcon } from "@phosphor-icons/react";

export const VIEW_OPTIONS = [
  { key: "dayGridMonth", label: "Month" },
  { key: "timeGridWeek", label: "Week" },
  { key: "timeGridDay", label: "Day" },
  { key: "listWeek", label: "Agenda" },
] as const;

export type CalendarViewKey = (typeof VIEW_OPTIONS)[number]["key"];

interface ToolbarProps {
  title: string;
  currentView: CalendarViewKey;
  onViewChange: (view: CalendarViewKey) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
  onSuggestSchedule: () => void;
}

export function Toolbar({
  title,
  currentView,
  onViewChange,
  onToday,
  onPrev,
  onNext,
  searchQuery,
  onSearchChange,
  onCreate,
  onSuggestSchedule,
}: ToolbarProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        rowGap: 8,
        borderBottom: "1px solid var(--color-divider)",
        padding: "8px var(--space-6)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
        <button type="button" className="nc-btn nc-btn-secondary" onClick={onToday}>
          Today
        </button>
        <button type="button" className="nc-btn nc-btn-secondary" style={{ padding: "0 10px" }} onClick={onPrev} aria-label="Previous">
          ‹
        </button>
        <button type="button" className="nc-btn nc-btn-secondary" style={{ padding: "0 10px" }} onClick={onNext} aria-label="Next">
          ›
        </button>
        <div style={{ marginLeft: 6, fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", rowGap: 8 }}>
        <div className="nc-input" style={{ display: "flex", alignItems: "center", gap: 8, width: 160, minWidth: 100 }}>
          <MagnifyingGlassIcon size={14} style={{ flex: "none", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }} />
          <input
            type="search"
            placeholder="Search events…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ border: "none", background: "none", outline: "none", width: "100%", color: "var(--color-text)", font: "inherit" }}
          />
        </div>
        <div className="nc-seg" style={{ flex: "none" }}>
          {VIEW_OPTIONS.map((view) => (
            <label key={view.key} className="nc-seg-opt" style={currentView === view.key ? { color: "var(--color-accent)" } : undefined}>
              <input type="radio" name="calendar-view" checked={currentView === view.key} onChange={() => onViewChange(view.key)} />
              {view.label}
            </label>
          ))}
        </div>
        <button type="button" className="nc-btn nc-btn-secondary" style={{ flex: "none" }} onClick={onSuggestSchedule}>
          Suggest schedule
        </button>
        <button type="button" className="nc-btn nc-btn-primary" style={{ flex: "none" }} onClick={onCreate}>
          Create
        </button>
      </div>
    </div>
  );
}
