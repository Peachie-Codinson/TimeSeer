import { apiClient } from "../../api/client";

export interface WorkSession {
  id: string;
  taskId: string;
  startsAt: number;
  endsAt: number;
  plannedMinutes: number;
  actualMinutes: number | null;
  status: "planned" | "in_progress" | "completed" | "partial" | "skipped" | "cancelled";
  locked: number;
}

export async function createWorkSession(input: { taskId: string; startsAt: number; endsAt: number }): Promise<WorkSession> {
  const res = await apiClient["work-sessions"].$post({ json: input });
  if (!res.ok) throw new Error("Failed to schedule work session");
  return res.json();
}
