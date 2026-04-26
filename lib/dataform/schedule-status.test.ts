import { describe, expect, it } from "vitest";
import { computeScheduleStatuses, countStaleSchedules } from "./aggregations";
import type { WorkflowConfig, WorkflowInvocation } from "./types";

const NOW = Date.UTC(2026, 3, 15, 12, 0, 0); // 2026-04-15 12:00 UTC

function cfg(partial: Partial<WorkflowConfig> & { id: string }): WorkflowConfig {
  return {
    name: `projects/p/locations/l/repositories/r/workflowConfigs/${partial.id}`,
    id: partial.id,
    cronSchedule: partial.cronSchedule,
    timeZone: partial.timeZone,
    releaseConfig: partial.releaseConfig,
    disabled: partial.disabled === true,
  };
}

function inv(configRef: string | undefined, startedMsAgo: number): WorkflowInvocation {
  const startTime = new Date(NOW - startedMsAgo).toISOString();
  return {
    id: `inv-${startedMsAgo}`,
    name: `projects/p/locations/l/repositories/r/workflowInvocations/inv-${startedMsAgo}`,
    state: "SUCCEEDED",
    trigger: "scheduled",
    createTime: startTime,
    startTime,
    workflowConfig: configRef,
  };
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("computeScheduleStatuses", () => {
  it("classifies on-time hourly cron as ok", () => {
    const c = cfg({ id: "hourly", cronSchedule: "0 * * * *" });
    const i = inv(c.name, 30 * 60 * 1000); // 30min ago
    const [status] = computeScheduleStatuses([c], [i], NOW);
    expect(status?.statusKind).toBe("ok");
    expect(status?.expectedIntervalMs).toBe(HOUR);
    expect(status?.lastInvocation?.id).toBe("inv-1800000");
  });

  it("classifies one missed firing as late", () => {
    const c = cfg({ id: "hourly", cronSchedule: "0 * * * *" });
    const i = inv(c.name, 1.5 * HOUR);
    const [status] = computeScheduleStatuses([c], [i], NOW);
    expect(status?.statusKind).toBe("late");
    expect(status?.stalenessRatio).toBe(1);
  });

  it("classifies multiple missed firings as stale", () => {
    const c = cfg({ id: "daily", cronSchedule: "0 2 * * *" });
    const i = inv(c.name, 3 * DAY);
    const [status] = computeScheduleStatuses([c], [i], NOW);
    expect(status?.statusKind).toBe("stale");
    expect(status?.expectedIntervalMs).toBe(DAY);
    expect(status?.stalenessRatio ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("does not flag weekday-only cron as stale during the weekend (bug_024)", () => {
    // 2026-04-15 is a Wednesday; pick a Saturday morning instead.
    const SAT_10AM = Date.UTC(2026, 3, 18, 10, 0, 0); // 2026-04-18 = Sat
    const FRI_17 = Date.UTC(2026, 3, 17, 17, 0, 0); // last business-hours slot
    const c = cfg({ id: "biz-hours", cronSchedule: "0 9-17 * * 1-5" });
    const i: WorkflowInvocation = {
      id: "inv-friday",
      name: `projects/p/locations/l/repositories/r/workflowInvocations/inv-friday`,
      state: "SUCCEEDED",
      trigger: "scheduled",
      createTime: new Date(FRI_17).toISOString(),
      startTime: new Date(FRI_17).toISOString(),
      workflowConfig: c.name,
    };
    const [status] = computeScheduleStatuses([c], [i], SAT_10AM);
    expect(status?.statusKind).toBe("ok");
  });

  it("returns never when config has no matching invocation", () => {
    const c = cfg({ id: "fresh", cronSchedule: "0 * * * *" });
    const [status] = computeScheduleStatuses([c], [], NOW);
    expect(status?.statusKind).toBe("never");
    expect(status?.lastInvocation).toBeUndefined();
    expect(status?.nextExpectedAt).toBeDefined();
  });

  it("returns disabled regardless of invocation history", () => {
    const c = cfg({ id: "off", cronSchedule: "0 * * * *", disabled: true });
    const i = inv(c.name, 5 * DAY);
    const [status] = computeScheduleStatuses([c], [i], NOW);
    expect(status?.statusKind).toBe("disabled");
  });

  it("handles timezone-aware crons (Europe/Paris daily at 02:00)", () => {
    const c = cfg({
      id: "paris-daily",
      cronSchedule: "0 2 * * *",
      timeZone: "Europe/Paris",
    });
    const i = inv(c.name, 12 * HOUR);
    const [status] = computeScheduleStatuses([c], [i], NOW);
    expect(status?.statusKind).toBe("ok");
    expect(status?.expectedIntervalMs).toBe(DAY);
  });

  it("returns invalid_cron on a malformed expression", () => {
    const c = cfg({ id: "broken", cronSchedule: "not a cron" });
    const [status] = computeScheduleStatuses([c], [], NOW);
    expect(status?.statusKind).toBe("invalid_cron");
  });

  it("returns no_cron when cronSchedule is missing and no invocation", () => {
    const c = cfg({ id: "manual" });
    const [status] = computeScheduleStatuses([c], [], NOW);
    expect(status?.statusKind).toBe("no_cron");
  });

  it("picks the most recent invocation when multiple match", () => {
    const c = cfg({ id: "hourly", cronSchedule: "0 * * * *" });
    const old = inv(c.name, 5 * HOUR);
    const fresh = inv(c.name, 0.5 * HOUR);
    const [status] = computeScheduleStatuses([c], [old, fresh], NOW);
    expect(status?.lastInvocation?.id).toBe("inv-1800000");
    expect(status?.statusKind).toBe("ok");
  });

  it("ignores invocations not linked to any config", () => {
    const c = cfg({ id: "hourly", cronSchedule: "0 * * * *" });
    const orphan = inv(undefined, 0.5 * HOUR);
    const [status] = computeScheduleStatuses([c], [orphan], NOW);
    expect(status?.statusKind).toBe("never");
  });
});

describe("countStaleSchedules", () => {
  it("counts only stale entries", () => {
    const c = cfg({ id: "daily", cronSchedule: "0 2 * * *" });
    const c2 = cfg({ id: "off", cronSchedule: "0 * * * *", disabled: true });
    const c3 = cfg({ id: "hourly", cronSchedule: "0 * * * *" });
    const statuses = computeScheduleStatuses(
      [c, c2, c3],
      [inv(c.name, 3 * DAY), inv(c3.name, 0.5 * HOUR)],
      NOW,
    );
    expect(countStaleSchedules(statuses)).toBe(1);
  });
});
