import { apiClient } from "../../api/client";

export type QuotaPeriod = "daily" | "weekly";
export type QuotaScopeType = "global" | "area";

export interface Quota {
  id: string;
  scopeType: QuotaScopeType;
  scopeId: string | null;
  period: QuotaPeriod;
  weekday: number | null;
  minimumMinutes: number | null;
  targetMinutes: number | null;
  maximumMinutes: number | null;
  active: number;
}

export interface QuotaInput {
  scopeType: QuotaScopeType;
  scopeId?: string;
  period: QuotaPeriod;
  weekday?: number;
  minimumMinutes?: number;
  targetMinutes?: number;
  maximumMinutes?: number;
  active?: boolean;
}

export interface QuotaProgress {
  quotaId: string;
  periodStart: number;
  periodEnd: number;
  plannedMinutes: number;
  completedMinutes: number;
}

export async function fetchQuotas(): Promise<Quota[]> {
  const res = await apiClient.quotas.$get();
  if (!res.ok) throw new Error("Failed to load quotas");
  // The server stores scopeType/period as free-form strings; this app only ever writes the
  // narrower values above, so the cast reflects real usage without widening the whole API.
  return (await res.json()) as Quota[];
}

export async function fetchQuotaProgress(): Promise<QuotaProgress[]> {
  const res = await apiClient.quotas.progress.$get();
  if (!res.ok) throw new Error("Failed to load quota progress");
  return res.json();
}

export interface QuotaHistoryEntry {
  periodsAgo: number;
  periodStart: number;
  periodEnd: number;
  plannedMinutes: number;
  completedMinutes: number;
}

export async function fetchQuotaHistory(quotaId: string, count = 6): Promise<QuotaHistoryEntry[]> {
  const res = await apiClient.quotas[":quotaId"].history.$get({ param: { quotaId }, query: { count: String(count) } });
  if (!res.ok) throw new Error("Failed to load quota history");
  return res.json();
}

export async function createQuota(input: QuotaInput): Promise<Quota> {
  const res = await apiClient.quotas.$post({ json: input });
  if (!res.ok) throw new Error("Failed to create quota");
  return (await res.json()) as Quota;
}

export async function updateQuota(quotaId: string, input: Partial<QuotaInput>): Promise<Quota> {
  const res = await apiClient.quotas[":quotaId"].$patch({ param: { quotaId }, json: input });
  if (!res.ok) throw new Error("Failed to update quota");
  return (await res.json()) as Quota;
}

export async function deleteQuota(quotaId: string): Promise<void> {
  const res = await apiClient.quotas[":quotaId"].$delete({ param: { quotaId } });
  if (!res.ok) throw new Error("Failed to delete quota");
}
