import { DevicesIcon, SignOutIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { AppSidebar } from "../../components/AppSidebar";
import "../../styles/nocturne.css";
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
    <div className="nc-shell" style={{ height: "100vh", width: "100vw", display: "flex", overflow: "hidden" }}>
      <AppSidebar>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <MiniCalendar
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              calendarRef.current?.gotoDate(date);
            }}
          />
          <AreaList />
        </div>
      </AppSidebar>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div
          style={{
            height: 52,
            flex: "none",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            borderBottom: "1px solid var(--color-divider)",
            padding: "0 var(--space-6)",
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: 15 }}>Today</div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <NotificationBell />
            <Link to="/sessions" className="nc-btn nc-hover" style={{ width: 32, padding: 0 }} aria-label="Devices">
              <DevicesIcon size={16} />
            </Link>
            <button
              type="button"
              className="nc-btn nc-hover"
              style={{ width: 32, padding: 0 }}
              aria-label="Log out"
              onClick={async () => {
                await logout();
                await queryClient.invalidateQueries({ queryKey: authStatusQueryKey });
              }}
            >
              <SignOutIcon size={16} />
            </button>
          </div>
        </div>
        <main style={{ flex: 1, minHeight: 0 }}>
          <CalendarView ref={calendarRef} onDateChange={setSelectedDate} />
        </main>
      </div>

      <div style={{ width: 340, flex: "none", borderLeft: "1px solid var(--color-divider)", overflow: "hidden" }}>
        <TaskPanel />
      </div>
    </div>
  );
}
