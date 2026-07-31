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
    <div style={{ fontSize: 11.5 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button
          type="button"
          className="nc-hover"
          style={{ background: "none", border: "none", cursor: "pointer", color: "color-mix(in srgb, var(--color-text) 55%, transparent)", padding: 2, borderRadius: "var(--radius-sm)" }}
          onClick={() => onSelectDate(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1))}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span style={{ fontWeight: 600 }}>{monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
        <button
          type="button"
          className="nc-hover"
          style={{ background: "none", border: "none", cursor: "pointer", color: "color-mix(in srgb, var(--color-text) 55%, transparent)", padding: 2, borderRadius: "var(--radius-sm)" }}
          onClick={() => onSelectDate(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1))}
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 4, textAlign: "center" }}>
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i} style={{ color: "color-mix(in srgb, var(--color-text) 40%, transparent)" }}>
            {label}
          </span>
        ))}
        {cells.map((date, i) => {
          const selected = date && isSameDay(date, selectedDate);
          const isToday = date && isSameDay(date, today);
          return (
            <button
              key={i}
              type="button"
              disabled={!date}
              onClick={() => date && onSelectDate(date)}
              className={date && !selected ? "nc-hover" : undefined}
              style={{
                aspectRatio: "1",
                borderRadius: "50%",
                border: "none",
                cursor: date ? "pointer" : "default",
                background: selected ? "var(--color-accent)" : "transparent",
                color: selected ? "var(--color-bg)" : isToday ? "var(--color-accent)" : "var(--color-text)",
                fontWeight: selected || isToday ? 600 : 400,
              }}
            >
              {date?.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
