import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { logout } from "../auth/api";
import { authStatusQueryKey } from "../auth/useAuthStatus";
import { AreaList } from "../areas/AreaList";
import { CalendarView, type CalendarViewHandle } from "../calendar/CalendarView";
import { MiniCalendar } from "../calendar/MiniCalendar";
import { NotificationBell } from "../notifications/NotificationBell";
import { TaskPanel } from "./TaskPanel";

export function DashboardPage() {
  const queryClient = useQueryClient();
  const calendarRef = useRef<CalendarViewHandle | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <div className="grid h-screen grid-cols-[240px_1fr_360px] bg-slate-950 text-slate-100">
      <aside className="flex flex-col gap-4 overflow-y-auto border-r border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold">Planner</h1>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <NotificationBell />
            <Link to="/sessions" className="hover:text-white">
              Devices
            </Link>
            <button
              className="hover:text-white"
              onClick={async () => {
                await logout();
                await queryClient.invalidateQueries({ queryKey: authStatusQueryKey });
              }}
            >
              Log out
            </button>
          </div>
        </div>

        <Link to="/tasks" className="btn-secondary text-center">
          Task board
        </Link>

        <MiniCalendar
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            calendarRef.current?.gotoDate(date);
          }}
        />

        <AreaList />
      </aside>

      <main className="min-h-0">
        <CalendarView ref={calendarRef} onDateChange={setSelectedDate} />
      </main>

      <aside className="overflow-y-auto border-l border-slate-800">
        <TaskPanel />
      </aside>
    </div>
  );
}
