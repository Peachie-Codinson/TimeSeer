import { apiClient } from "../../api/client";

export interface Area {
  id: string;
  name: string;
  kind: "course" | "research" | "teaching" | "administration" | "personal" | "other";
  color: string | null;
  icon: string | null;
  active: boolean | number;
}

export async function fetchAreas(): Promise<Area[]> {
  const res = await apiClient.areas.$get();
  if (!res.ok) throw new Error("Failed to load areas");
  return res.json();
}

export async function createArea(input: { name: string; kind: Area["kind"]; color?: string }) {
  const res = await apiClient.areas.$post({ json: input });
  if (!res.ok) throw new Error("Failed to create area");
  return res.json();
}
