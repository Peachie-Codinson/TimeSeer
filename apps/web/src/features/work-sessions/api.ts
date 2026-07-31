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
  version: number;
}

export async function fetchActiveWorkSession(): Promise<{ session: WorkSession; task: import("../tasks/types").Task } | null> {
  const res = await apiClient["work-sessions"].active.$get();
  if (!res.ok) throw new Error("Failed to load active work session");
  return res.json();
}

export async function createWorkSession(input: { taskId: string; startsAt: number; endsAt: number }): Promise<WorkSession> {
  const res = await apiClient["work-sessions"].$post({ json: input });
  if (!res.ok) throw new Error("Failed to schedule work session");
  return res.json();
}

export async function startWorkSession(id: string, expectedVersion: number): Promise<WorkSession> {
  const res = await apiClient["work-sessions"][":sessionId"].start.$post({
    param: { sessionId: id },
    json: { expectedVersion },
  });
  if (!res.ok) throw new Error("Failed to start work session");
  return res.json();
}

export async function completeWorkSession(id: string, expectedVersion: number, actualMinutes?: number): Promise<WorkSession> {
  const res = await apiClient["work-sessions"][":sessionId"].complete.$post({
    param: { sessionId: id },
    json: { expectedVersion, actualMinutes },
  });
  if (!res.ok) throw new Error("Failed to complete work session");
  return res.json();
}

export async function partialWorkSession(id: string, expectedVersion: number, actualMinutes: number): Promise<WorkSession> {
  const res = await apiClient["work-sessions"][":sessionId"].partial.$post({
    param: { sessionId: id },
    json: { expectedVersion, actualMinutes },
  });
  if (!res.ok) throw new Error("Failed to record partial completion");
  return res.json();
}

export async function skipWorkSession(id: string, expectedVersion: number): Promise<WorkSession> {
  const res = await apiClient["work-sessions"][":sessionId"].skip.$post({
    param: { sessionId: id },
    json: { expectedVersion },
  });
  if (!res.ok) throw new Error("Failed to skip work session");
  return res.json();
}
