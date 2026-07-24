import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "./api";

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-800 px-4 py-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </div>
  );
}

export function TaskPanel() {
  const { start, end } = todayRange();
  const { data } = useQuery({
    queryKey: ["dashboard", start, end],
    queryFn: () => fetchDashboard(start, end),
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  const tasks = data?.tasks;
  const quota = data?.quotaSummary;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Section title="Now">
        <p className="text-sm text-slate-500">Nothing happening right now.</p>
      </Section>

      <Section title="In Progress">
        {tasks?.inProgress.length ? null : <p className="text-sm text-slate-500">No tasks in progress.</p>}
      </Section>

      <Section title="Urgent & Time-Gated">
        {tasks?.urgent.length ? null : <p className="text-sm text-slate-500">Nothing urgent.</p>}
      </Section>

      <Section title="Active Next">
        {tasks?.activeNext.length ? null : (
          <p className="text-sm text-slate-500">
            The task board hasn&apos;t landed yet — this fills in once tasks exist.
          </p>
        )}
      </Section>

      <Section title="Quota Summary">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label="Completed" value={quota?.completedMinutes ?? 0} />
          <Stat label="Scheduled" value={quota?.scheduledMinutes ?? 0} />
          <Stat label="Target" value={quota?.targetMinutes ?? 0} />
          <Stat label="Remaining" value={quota?.remainingMinutes ?? 0} />
        </div>
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-900 p-2">
      <p className="text-slate-500">{label}</p>
      <p className="text-slate-200">{value}m</p>
    </div>
  );
}
