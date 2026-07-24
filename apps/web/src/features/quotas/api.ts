import { apiClient } from "../../api/client";

export interface Quota {
  id: string;
  scopeType: string;
  scopeId: string | null;
  period: string;
  weekday: number | null;
  minimumMinutes: number | null;
  targetMinutes: number | null;
  maximumMinutes: number | null;
  active: number;
}

export async function fetchQuotas(): Promise<Quota[]> {
  const res = await apiClient.quotas.$get();
  if (!res.ok) throw new Error("Failed to load quotas");
  return res.json();
}

export async function createQuota(targetMinutes: number): Promise<Quota> {
  const res = await apiClient.quotas.$post({ json: { scopeType: "global", period: "daily", targetMinutes } });
  if (!res.ok) throw new Error("Failed to create quota");
  return res.json();
}

export async function updateQuota(quotaId: string, targetMinutes: number): Promise<Quota> {
  const res = await apiClient.quotas[":quotaId"].$patch({ param: { quotaId }, json: { targetMinutes } });
  if (!res.ok) throw new Error("Failed to update quota");
  return res.json();
}
