function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function MiniCalendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const monthStart = startOfMonth(selectedDate);
  const firstWeekday = monthStart.getDay();
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const today = new Date();

  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1)),
  ];

  return (
    <div className="rounded-md border border-slate-800 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <button
          className="text-slate-400 hover:text-white"
          onClick={() => onSelectDate(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1))}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="font-medium text-slate-200">
          {monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button
          className="text-slate-400 hover:text-white"
          onClick={() => onSelectDate(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1))}
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-slate-500">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
        {cells.map((date, i) => (
          <button
            key={i}
            disabled={!date}
            onClick={() => date && onSelectDate(date)}
            className={`aspect-square rounded-full ${
              !date
                ? ""
                : isSameDay(date, selectedDate)
                  ? "bg-slate-100 text-slate-900"
                  : isSameDay(date, today)
                    ? "text-emerald-400"
                    : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            {date?.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
}
