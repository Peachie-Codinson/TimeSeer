import { apiClient } from "../../api/client";

export interface Notification {
  id: string;
  type:
    | "event_starting"
    | "session_starting"
    | "deadline_approaching"
    | "gate_opening"
    | "gate_closing"
    | "overdue"
    | "archive_completed";
  message: string;
  relatedId: string | null;
  severity: "info" | "warning" | "critical";
  at: number;
}

export async function fetchNotifications(): Promise<Notification[]> {
  const res = await apiClient.notifications.$get();
  if (!res.ok) throw new Error("Failed to load notifications");
  return res.json();
}
