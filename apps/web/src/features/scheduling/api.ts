import { apiClient } from "../../api/client";

export interface ScheduleProposal {
  taskId: string;
  startsAt: number;
  endsAt: number;
  explanation: string;
}

export interface UnscheduledTask {
  taskId: string;
  reason: string;
}

export interface RiskWarning {
  taskId: string;
  severity: "warning" | "critical";
  message: string;
}

export interface ScheduleResult {
  proposals: ScheduleProposal[];
  unscheduled: UnscheduledTask[];
  risks: RiskWarning[];
}

export async function previewSchedule(rangeStart: number, rangeEnd: number): Promise<ScheduleResult> {
  const res = await apiClient.schedule.preview.$post({
    query: { rangeStart: String(rangeStart), rangeEnd: String(rangeEnd) },
  });
  if (!res.ok) throw new Error("Failed to preview schedule");
  return res.json();
}

export async function applySchedule(proposals: ScheduleProposal[]): Promise<void> {
  const res = await apiClient.schedule.apply.$post({
    json: { proposals: proposals.map((p) => ({ taskId: p.taskId, startsAt: p.startsAt, endsAt: p.endsAt })) },
  });
  if (!res.ok) throw new Error("Failed to apply schedule");
}
