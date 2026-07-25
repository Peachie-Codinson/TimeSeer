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
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
      <div className="flex items-center gap-2">
        <button className="btn-secondary" onClick={onToday}>
          Today
        </button>
        <button className="btn-secondary px-2" onClick={onPrev} aria-label="Previous">
          ‹
        </button>
        <button className="btn-secondary px-2" onClick={onNext} aria-label="Next">
          ›
        </button>
        <h2 className="ml-2 text-sm font-medium text-slate-200">{title}</h2>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="search"
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input w-40 py-1.5"
        />
        <div className="flex overflow-hidden rounded-md border border-slate-700">
          {VIEW_OPTIONS.map((view) => (
            <button
              key={view.key}
              onClick={() => onViewChange(view.key)}
              className={`px-3 py-1.5 text-sm ${
                currentView === view.key
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
        <button className="btn-secondary" onClick={onSuggestSchedule}>
          Suggest schedule
        </button>
        <button className="btn-primary w-auto px-3 py-1.5" onClick={onCreate}>
          Create
        </button>
      </div>
    </div>
  );
}
