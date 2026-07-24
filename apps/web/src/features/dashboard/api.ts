import { apiClient } from "../../api/client";

export async function fetchDashboard(rangeStart: number, rangeEnd: number) {
  const res = await apiClient.dashboard.$get({
    query: {
      rangeStart: String(rangeStart),
      rangeEnd: String(rangeEnd),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}
