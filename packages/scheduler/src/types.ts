export interface SchedulableTask {
  id: string;
  title: string;
  priority: number;
  position: number;
  earliestStart: number | null;
  preferredEnd: number | null;
  hardDeadline: number | null;
  /** Minutes of work left to schedule. Callers should fold estimatedMinutes in as the default. */
  remainingMinutes: number | null;
  /** Preferred length of a single session; falls back to a default when unset. */
  sessionMinutes: number | null;
  isSplittable: boolean;
  schedulingMode: "manual" | "suggested" | "automatic";
}

export interface BusyInterval {
  start: number;
  end: number;
}

export interface WorkingHours {
  /** 0 = Sunday .. 6 = Saturday */
  daysOfWeek: number[];
  /** Minutes since local midnight. */
  startMinute: number;
  endMinute: number;
}

export interface DailyQuota {
  maximumMinutes: number | null;
}

export interface ScheduleInput {
  tasks: SchedulableTask[];
  /** Fixed events and already-locked/placed work sessions — time the scheduler must not use. */
  busyIntervals: BusyInterval[];
  workingHours: WorkingHours;
  quota: DailyQuota;
  rangeStart: number;
  rangeEnd: number;
  now: number;
  minSessionMinutes?: number;
  defaultSessionMinutes?: number;
}

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
