import { apiClient } from "../../api/client";
import type { Board, Task, TaskInput, TaskState } from "./types";

async function readErrorCode(res: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
      return body.error;
    }
  } catch {
    // ignore parse failures, fall through to the default message
  }
  return fallback;
}

export async function fetchTasks(): Promise<Task[]> {
  const res = await apiClient.tasks.$get();
  if (!res.ok) throw new Error("Failed to load tasks");
  return res.json();
}

export async function fetchBoard(): Promise<Board> {
  const res = await apiClient.board.$get();
  if (!res.ok) throw new Error("Failed to load board");
  return res.json();
}

export async function fetchTask(taskId: string): Promise<Task> {
  const res = await apiClient.tasks[":taskId"].$get({ param: { taskId } });
  if (!res.ok) throw new Error("Failed to load task");
  return res.json();
}

export async function createTask(input: TaskInput): Promise<Task> {
  const res = await apiClient.tasks.$post({ json: input });
  if (!res.ok) throw new Error(await readErrorCode(res, "create_task_failed"));
  return res.json();
}

export async function updateTask(taskId: string, input: Partial<TaskInput> & { expectedVersion: number }): Promise<Task> {
  const res = await apiClient.tasks[":taskId"].$patch({ param: { taskId }, json: input });
  if (!res.ok) throw new Error(await readErrorCode(res, "update_task_failed"));
  return res.json();
}

export async function moveTask(
  taskId: string,
  input: { toState: TaskState; previousTaskId?: string; nextTaskId?: string; expectedVersion: number },
): Promise<Task> {
  const res = await apiClient.tasks[":taskId"].move.$post({
    param: { taskId },
    json: { toState: input.toState as "active" | "in_progress" | "resolved", previousTaskId: input.previousTaskId, nextTaskId: input.nextTaskId, expectedVersion: input.expectedVersion },
  });
  if (!res.ok) throw new Error(await readErrorCode(res, "move_task_failed"));
  return res.json();
}

export async function startTask(taskId: string, expectedVersion: number): Promise<Task> {
  const res = await apiClient.tasks[":taskId"].start.$post({ param: { taskId }, json: { expectedVersion } });
  if (!res.ok) throw new Error(await readErrorCode(res, "start_task_failed"));
  return res.json();
}

export async function returnToActive(taskId: string, expectedVersion: number): Promise<Task> {
  const res = await apiClient.tasks[":taskId"]["return-active"].$post({ param: { taskId }, json: { expectedVersion } });
  if (!res.ok) throw new Error(await readErrorCode(res, "return_active_failed"));
  return res.json();
}

export async function resolveTask(taskId: string, expectedVersion: number): Promise<Task> {
  const res = await apiClient.tasks[":taskId"].resolve.$post({ param: { taskId }, json: { expectedVersion } });
  if (!res.ok) throw new Error(await readErrorCode(res, "resolve_task_failed"));
  return res.json();
}

export async function reopenTask(taskId: string, expectedVersion: number): Promise<Task> {
  const res = await apiClient.tasks[":taskId"].reopen.$post({ param: { taskId }, json: { expectedVersion } });
  if (!res.ok) throw new Error(await readErrorCode(res, "reopen_task_failed"));
  return res.json();
}

export async function snoozeTask(taskId: string, expectedVersion: number, until: number): Promise<Task> {
  const res = await apiClient.tasks[":taskId"].snooze.$post({ param: { taskId }, json: { expectedVersion, until } });
  if (!res.ok) throw new Error(await readErrorCode(res, "snooze_task_failed"));
  return res.json();
}

export async function blockTask(taskId: string, expectedVersion: number, reason: string): Promise<Task> {
  const res = await apiClient.tasks[":taskId"].block.$post({ param: { taskId }, json: { expectedVersion, reason } });
  if (!res.ok) throw new Error(await readErrorCode(res, "block_task_failed"));
  return res.json();
}

export async function unblockTask(taskId: string, expectedVersion: number): Promise<Task> {
  const res = await apiClient.tasks[":taskId"].unblock.$post({ param: { taskId }, json: { expectedVersion } });
  if (!res.ok) throw new Error(await readErrorCode(res, "unblock_task_failed"));
  return res.json();
}
