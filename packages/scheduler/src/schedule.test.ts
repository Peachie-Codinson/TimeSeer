import { describe, expect, it } from "vitest";
import { proposeSchedule } from "./schedule.js";
import type { SchedulableTask, ScheduleInput } from "./types.js";

// Monday 2026-07-27 00:00 UTC, chosen so working-hours weekday math is unambiguous in tests.
const MONDAY = Date.UTC(2026, 6, 27, 0, 0, 0);
const DAY_MS = 24 * 60 * 60 * 1000;

const WORKING_HOURS = { daysOfWeek: [1, 2, 3, 4, 5], startMinute: 9 * 60, endMinute: 18 * 60 };

function baseTask(overrides: Partial<SchedulableTask>): SchedulableTask {
  return {
    id: "t1",
    title: "Task",
    priority: 0,
    position: 1024,
    earliestStart: null,
    preferredEnd: null,
    hardDeadline: null,
    remainingMinutes: 60,
    sessionMinutes: null,
    isSplittable: true,
    schedulingMode: "suggested",
    ...overrides,
  };
}

function baseInput(overrides: Partial<ScheduleInput>): ScheduleInput {
  return {
    tasks: [],
    busyIntervals: [],
    workingHours: WORKING_HOURS,
    quota: { maximumMinutes: null },
    rangeStart: MONDAY,
    rangeEnd: MONDAY + 7 * DAY_MS,
    now: MONDAY,
    ...overrides,
  };
}

describe("proposeSchedule", () => {
  it("places a single task at the start of the working day", () => {
    const result = proposeSchedule(baseInput({ tasks: [baseTask({ remainingMinutes: 60 })] }));

    expect(result.proposals).toHaveLength(1);
    expect(result.unscheduled).toHaveLength(0);
    expect(result.proposals[0].startsAt).toBe(MONDAY + 9 * 60 * 60_000);
    expect(result.proposals[0].endsAt).toBe(MONDAY + 10 * 60 * 60_000);
  });

  it("schedules around a busy interval blocking the morning", () => {
    const busyEnd = MONDAY + 11 * 60 * 60_000;
    const result = proposeSchedule(
      baseInput({
        tasks: [baseTask({ remainingMinutes: 30 })],
        busyIntervals: [{ start: MONDAY + 9 * 60 * 60_000, end: busyEnd }],
      }),
    );

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].startsAt).toBe(busyEnd);
  });

  it("splits a splittable task with more remaining time than fits in one working day", () => {
    // 9h working day; ask for 12h of remaining work -> should spill onto day 2.
    const result = proposeSchedule(
      baseInput({ tasks: [baseTask({ remainingMinutes: 12 * 60, sessionMinutes: 9 * 60 })] }),
    );

    expect(result.unscheduled).toHaveLength(0);
    const totalScheduled = result.proposals.reduce((sum, p) => sum + (p.endsAt - p.startsAt) / 60_000, 0);
    expect(totalScheduled).toBe(12 * 60);
    expect(result.proposals.length).toBeGreaterThanOrEqual(2);
  });

  it("leaves a non-splittable task unscheduled when no chunk is big enough", () => {
    const result = proposeSchedule(
      baseInput({
        tasks: [baseTask({ remainingMinutes: 600, isSplittable: false, sessionMinutes: 600 })],
        // Only 8 working hours (480 min) available per day — never enough for a 600min block.
        rangeStart: MONDAY,
        rangeEnd: MONDAY + 2 * DAY_MS,
      }),
    );

    expect(result.proposals).toHaveLength(0);
    expect(result.unscheduled).toHaveLength(1);
  });

  it("flags an overdue task as a critical risk", () => {
    const result = proposeSchedule(
      baseInput({
        tasks: [baseTask({ hardDeadline: MONDAY - DAY_MS, remainingMinutes: 30 })],
      }),
    );

    expect(result.risks.some((r) => r.taskId === "t1" && r.severity === "critical")).toBe(true);
  });

  it("skips tasks in manual scheduling mode", () => {
    const result = proposeSchedule(baseInput({ tasks: [baseTask({ schedulingMode: "manual" })] }));

    expect(result.proposals).toHaveLength(0);
    expect(result.unscheduled).toHaveLength(0);
  });

  it("never proposes a session before now, even when rangeStart is in the past", () => {
    // Simulates a calendar week view: rangeStart is the start of the week (Monday), but
    // "now" is Wednesday midday, partway through it.
    const wednesdayNoon = MONDAY + 2 * DAY_MS + 12 * 60 * 60_000;

    const result = proposeSchedule(
      baseInput({
        tasks: [baseTask({ remainingMinutes: 30 })],
        rangeStart: MONDAY,
        rangeEnd: MONDAY + 7 * DAY_MS,
        now: wednesdayNoon,
      }),
    );

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].startsAt).toBeGreaterThanOrEqual(wednesdayNoon);
  });

  it("respects the daily quota maximum across tasks", () => {
    const result = proposeSchedule(
      baseInput({
        tasks: [baseTask({ id: "a", position: 1, remainingMinutes: 60 }), baseTask({ id: "b", position: 2, remainingMinutes: 60 })],
        quota: { maximumMinutes: 60 },
        rangeStart: MONDAY,
        rangeEnd: MONDAY + 2 * DAY_MS,
      }),
    );

    const dayOneMinutes = result.proposals
      .filter((p) => p.startsAt < MONDAY + DAY_MS)
      .reduce((sum, p) => sum + (p.endsAt - p.startsAt) / 60_000, 0);
    expect(dayOneMinutes).toBeLessThanOrEqual(60);
  });
});
