export type TaskState = "active" | "in_progress" | "resolved" | "archived";
export type SchedulingMode = "manual" | "suggested" | "automatic";

export interface Task {
  id: string;
  issueNumber: number;
  title: string;
  description: string | null;
  state: TaskState;
  areaId: string | null;
  priority: number;
  position: number;
  earliestStart: number | null;
  preferredStart: number | null;
  preferredEnd: number | null;
  softDeadline: number | null;
  hardDeadline: number | null;
  estimatedMinutes: number | null;
  remainingMinutes: number | null;
  sessionMinutes: number | null;
  isSplittable: number;
  schedulingMode: SchedulingMode;
  progressPercent: number;
  blockedReason: string | null;
  externalSource: string | null;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface TaskInput {
  title: string;
  description?: string;
  areaId?: string;
  priority?: number;
  earliestStart?: number;
  preferredStart?: number;
  preferredEnd?: number;
  softDeadline?: number;
  hardDeadline?: number;
  estimatedMinutes?: number;
  remainingMinutes?: number;
  sessionMinutes?: number;
  isSplittable?: boolean;
  schedulingMode?: SchedulingMode;
}

export interface Board {
  active: Task[];
  inProgress: Task[];
  resolved: Task[];
}
