import { apiClient } from "../../api/client";
import type { Task } from "../tasks/types";

export async function fetchArchive(): Promise<Task[]> {
  const res = await apiClient.archive.$get();
  if (!res.ok) throw new Error("Failed to load archive");
  return res.json();
}

export async function flushPreview(): Promise<{ eligibleCount: number; taskIds: string[] }> {
  const res = await apiClient.archive["flush-preview"].$post();
  if (!res.ok) throw new Error("Failed to preview flush");
  return res.json();
}

export async function flushArchive(taskIds?: string[]): Promise<{ batchId: string | null; archivedCount: number }> {
  const res = await apiClient.archive.flush.$post(taskIds ? { json: { taskIds } } : {});
  if (!res.ok) throw new Error("Failed to archive tasks");
  return res.json();
}

export async function restoreArchivedTask(taskId: string): Promise<Task> {
  const res = await apiClient.archive.tasks[":taskId"].restore.$post({ param: { taskId } });
  if (!res.ok) throw new Error("Failed to restore task");
  return res.json();
}

export async function permanentlyDeleteTask(taskId: string): Promise<void> {
  const res = await apiClient.archive.tasks[":taskId"].$delete({ param: { taskId } });
  if (!res.ok) throw new Error("Failed to permanently delete task");
}
