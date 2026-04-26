/**
 * Pure aggregation functions operating on lists of invocations.
 * No side effects. These are unit-testable with Vitest.
 *
 * Everything is computed on the fly — there is no persistence layer.
 */
import { CronExpressionParser } from "cron-parser";
import type {
  CompilationHealth,
  CompilationResult,
  InvocationState,
  PeriodKey,
  ScheduleStatus,
  ScheduleStatusKind,
  WorkflowConfig,
  WorkflowInvocation,
  WorkflowInvocationWithActions,
} from "./types";
import { PERIOD_MS } from "./types";

export interface GlobalKpis {
  runs24h: number;
  runsDelta: number;
  successRate24h: number;
  successRateDelta: number;
  activeRuns: number;
  failedAssertions24h: number;
  failedAssertionsDelta: number;
}

export function computeGlobalKpis(
  invocations24h: WorkflowInvocationWithActions[],
  invocationsPrev24h: WorkflowInvocationWithActions[],
): GlobalKpis {
  const activeRuns = invocations24h.filter((i) => i.state === "RUNNING").length;

  const finished24h = invocations24h.filter((i) => i.state !== "RUNNING");
  const finishedPrev = invocationsPrev24h.filter((i) => i.state !== "RUNNING");

  const succ = finished24h.filter((i) => i.state === "SUCCEEDED").length;
  const succPrev = finishedPrev.filter((i) => i.state === "SUCCEEDED").length;

  const successRate24h =
    finished24h.length > 0 ? (succ / finished24h.length) * 100 : 0;
  const successRatePrev =
    finishedPrev.length > 0 ? (succPrev / finishedPrev.length) * 100 : 0;

  const failedAssertions24h = invocations24h.reduce(
    (acc, i) => acc + (i.assertionsFailed ?? 0),
    0,
  );
  const failedAssertionsPrev = invocationsPrev24h.reduce(
    (acc, i) => acc + (i.assertionsFailed ?? 0),
    0,
  );

  return {
    runs24h: invocations24h.length,
    runsDelta: invocations24h.length - invocationsPrev24h.length,
    successRate24h,
    successRateDelta: successRate24h - successRatePrev,
    activeRuns,
    failedAssertions24h,
    failedAssertionsDelta: failedAssertions24h - failedAssertionsPrev,
  };
}

export interface RepoCardStats {
  lastState: InvocationState;
  lastRunTime?: string;
  recent10Statuses: InvocationState[];
  recent10Durations: Array<number | null>;
  successRate: number;
  avgDurationMs: number;
  assertionsPassRate: number;
}

export function computeRepoCardStats(
  invocations: WorkflowInvocationWithActions[],
  period: PeriodKey = "90d",
  now: number = Date.now(),
): RepoCardStats {
  const sorted = [...invocations].sort(
    (a, b) => new Date(b.startTime ?? b.createTime).getTime() - new Date(a.startTime ?? a.createTime).getTime(),
  );
  const recent10 = sorted.slice(0, 10);
  const windowMs = PERIOD_MS[period];
  const inPeriod = sorted.filter(
    (i) => now - new Date(i.startTime ?? i.createTime).getTime() <= windowMs,
  );

  const finished = inPeriod.filter((i) => i.state !== "RUNNING");
  const succ = finished.filter((i) => i.state === "SUCCEEDED").length;
  const successRate = finished.length > 0 ? (succ / finished.length) * 100 : 0;

  const durations = finished.map((i) => i.durationMs).filter((d): d is number => d != null);
  const avgDuration =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  let assertsOk = 0;
  let assertsTotal = 0;
  for (const i of inPeriod) {
    assertsOk += i.assertionsSucceeded ?? 0;
    assertsTotal += i.assertionsTotal ?? 0;
  }

  return {
    lastState: recent10[0]?.state ?? "UNKNOWN",
    lastRunTime: recent10[0]?.startTime,
    recent10Statuses: recent10.map((i) => i.state).reverse(),
    recent10Durations: recent10.map((i) => i.durationMs ?? null).reverse(),
    successRate,
    avgDurationMs: avgDuration,
    assertionsPassRate: assertsTotal > 0 ? (assertsOk / assertsTotal) * 100 : 0,
  };
}

export interface RepoKpis {
  totalInvocations: number;
  invocationsDelta: number;
  successRate: number;
  successRateSpark: number[];
  durationMedianMs: number;
  durationP95Ms: number;
  assertionsPassRate: number;
  assertionsDelta: number;
}

function withinPeriod(
  invocations: WorkflowInvocationWithActions[],
  period: PeriodKey,
  now: number,
  offset = 0,
): WorkflowInvocationWithActions[] {
  const windowMs = PERIOD_MS[period];
  const start = now - windowMs * (offset + 1);
  const end = now - windowMs * offset;
  return invocations.filter((i) => {
    const t = new Date(i.startTime ?? i.createTime).getTime();
    return t >= start && t < end;
  });
}

export function computeRepoKpis(
  invocations: WorkflowInvocationWithActions[],
  period: PeriodKey,
  now: number = Date.now(),
): RepoKpis {
  const curr = withinPeriod(invocations, period, now, 0);
  const prev = withinPeriod(invocations, period, now, 1);

  const finished = curr.filter((i) => i.state !== "RUNNING");
  const succ = finished.filter((i) => i.state === "SUCCEEDED").length;
  const successRate = finished.length ? (succ / finished.length) * 100 : 0;

  const durations = finished.map((i) => i.durationMs).filter((d): d is number => d != null);
  durations.sort((a, b) => a - b);
  const median = percentile(durations, 0.5);
  const p95 = percentile(durations, 0.95);

  let assertsOk = 0;
  let assertsTotal = 0;
  let assertsOkPrev = 0;
  let assertsTotalPrev = 0;
  for (const i of curr) {
    assertsOk += i.assertionsSucceeded ?? 0;
    assertsTotal += i.assertionsTotal ?? 0;
  }
  for (const i of prev) {
    assertsOkPrev += i.assertionsSucceeded ?? 0;
    assertsTotalPrev += i.assertionsTotal ?? 0;
  }
  const assertRate = assertsTotal > 0 ? (assertsOk / assertsTotal) * 100 : 0;
  const assertRatePrev = assertsTotalPrev > 0 ? (assertsOkPrev / assertsTotalPrev) * 100 : 0;

  // Success rate sparkline: one point per bucket over the period.
  const buckets = bucketsForPeriod(period);
  const series = computeSuccessRateSeries(invocations, period, buckets, now);
  const spark = series.map((b) => b.rate);

  return {
    totalInvocations: curr.length,
    invocationsDelta: curr.length - prev.length,
    successRate,
    successRateSpark: spark,
    durationMedianMs: median,
    durationP95Ms: p95,
    assertionsPassRate: assertRate,
    assertionsDelta: assertRate - assertRatePrev,
  };
}

function percentile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor(q * sortedAsc.length));
  return sortedAsc[idx]!;
}

function bucketsForPeriod(period: PeriodKey): number {
  if (period === "1h") return 12;
  if (period === "24h") return 24;
  if (period === "7d") return 7;
  if (period === "30d") return 30;
  return 30; // 90d → weekly-ish buckets
}

export interface TimelineBar {
  id: string;
  state: InvocationState;
  startMs: number;
  durationMs: number;
}

export function computeRunsTimeline(
  invocations: WorkflowInvocation[],
  period: PeriodKey,
  now: number = Date.now(),
): { start: number; end: number; bars: TimelineBar[] } {
  const windowMs = PERIOD_MS[period];
  const start = now - windowMs;
  const bars = invocations
    .map((i) => {
      const t = new Date(i.startTime ?? i.createTime).getTime();
      return {
        id: i.id,
        state: i.state,
        startMs: t,
        durationMs: i.durationMs ?? 0,
      } satisfies TimelineBar;
    })
    .filter((b) => b.startMs >= start && b.startMs <= now);
  return { start, end: now, bars };
}

export interface SuccessRateBucket {
  bucketStart: number;
  total: number;
  succeeded: number;
  rate: number;
}

export function computeSuccessRateSeries(
  invocations: WorkflowInvocation[],
  period: PeriodKey,
  buckets: number = bucketsForPeriod(period),
  now: number = Date.now(),
): SuccessRateBucket[] {
  const windowMs = PERIOD_MS[period];
  const bucketMs = windowMs / buckets;
  const start = now - windowMs;
  const series: SuccessRateBucket[] = Array.from({ length: buckets }, (_, i) => ({
    bucketStart: start + i * bucketMs,
    total: 0,
    succeeded: 0,
    rate: 0,
  }));

  for (const i of invocations) {
    if (i.state === "RUNNING") continue;
    const t = new Date(i.startTime ?? i.createTime).getTime();
    if (t < start || t > now) continue;
    const bucketIdx = Math.min(buckets - 1, Math.floor((t - start) / bucketMs));
    const b = series[bucketIdx]!;
    b.total++;
    if (i.state === "SUCCEEDED") b.succeeded++;
  }
  for (const b of series) {
    b.rate = b.total > 0 ? (b.succeeded / b.total) * 100 : 0;
  }
  return series;
}

export interface HistogramBucket {
  rangeStartMs: number;
  rangeEndMs: number;
  count: number;
}

export function computeDurationHistogram(
  invocations: WorkflowInvocation[],
  bucketCount = 12,
): { buckets: HistogramBucket[]; p95Ms: number; p50Ms: number } {
  const durations = invocations
    .filter((i) => i.state !== "RUNNING")
    .map((i) => i.durationMs)
    .filter((d): d is number => typeof d === "number" && d > 0);

  if (durations.length === 0) {
    return { buckets: [], p50Ms: 0, p95Ms: 0 };
  }
  const sorted = [...durations].sort((a, b) => a - b);
  const p50 = percentile(sorted, 0.5);
  const p95 = percentile(sorted, 0.95);
  const max = sorted[sorted.length - 1]!;
  const bucketSize = Math.max(1, Math.ceil(max / bucketCount));
  const buckets: HistogramBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
    rangeStartMs: i * bucketSize,
    rangeEndMs: (i + 1) * bucketSize,
    count: 0,
  }));
  for (const d of durations) {
    const idx = Math.min(bucketCount - 1, Math.floor(d / bucketSize));
    buckets[idx]!.count++;
  }
  return { buckets, p50Ms: p50, p95Ms: p95 };
}

export interface FailingAction {
  target: string;
  totalRuns: number;
  failedCount: number;
  failRate: number;
}

export function computeTopFailingActions(
  invocationsWithActions: WorkflowInvocationWithActions[],
  limit = 5,
): FailingAction[] {
  const stats = new Map<string, { total: number; failed: number }>();
  for (const inv of invocationsWithActions) {
    for (const a of inv.actions) {
      if (a.type === "ASSERTION") continue;
      if (!a.target.full || a.target.full === "—") continue;
      const s = stats.get(a.target.full) ?? { total: 0, failed: 0 };
      s.total++;
      if (a.state === "FAILED") s.failed++;
      stats.set(a.target.full, s);
    }
  }
  return Array.from(stats.entries())
    .filter(([, s]) => s.failed > 0)
    .map(([target, s]) => ({
      target,
      totalRuns: s.total,
      failedCount: s.failed,
      failRate: s.total > 0 ? (s.failed / s.total) * 100 : 0,
    }))
    .sort((a, b) => b.failRate - a.failRate || b.failedCount - a.failedCount)
    .slice(0, limit);
}

export interface HeatmapCell {
  assertion: string;
  invocationId: string;
  runIndex: number;
  state: InvocationState | "NO_DATA";
  invocationStartTime?: string;
  error?: string;
}

export interface AssertionsHeatmap {
  assertions: string[];
  runIds: string[];
  runStartTimes: string[];
  cells: HeatmapCell[];
  totalAssertions: number;
}

export function computeAssertionsHeatmap(
  invocationsWithActions: WorkflowInvocationWithActions[],
  maxAssertions = 20,
  maxRuns = 30,
): AssertionsHeatmap {
  const sortedRuns = [...invocationsWithActions]
    .sort(
      (a, b) =>
        new Date(a.startTime ?? a.createTime).getTime() -
        new Date(b.startTime ?? b.createTime).getTime(),
    )
    .slice(-maxRuns);

  const failCounts = new Map<string, number>();
  for (const run of invocationsWithActions) {
    for (const a of run.actions) {
      if (a.type !== "ASSERTION") continue;
      if (a.state === "FAILED") {
        failCounts.set(a.target.full, (failCounts.get(a.target.full) ?? 0) + 1);
      } else if (!failCounts.has(a.target.full)) {
        failCounts.set(a.target.full, 0);
      }
    }
  }

  const assertions = Array.from(failCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, maxAssertions)
    .map(([name]) => name);

  const cells: HeatmapCell[] = [];
  sortedRuns.forEach((run, runIndex) => {
    const byTarget = new Map(run.actions.map((a) => [a.target.full, a] as const));
    for (const assertion of assertions) {
      const action = byTarget.get(assertion);
      cells.push({
        assertion,
        invocationId: run.id,
        runIndex,
        state: action ? action.state : "NO_DATA",
        invocationStartTime: run.startTime,
        error: action?.failureReason,
      });
    }
  });

  return {
    assertions,
    runIds: sortedRuns.map((r) => r.id),
    runStartTimes: sortedRuns.map((r) => r.startTime ?? r.createTime),
    cells,
    totalAssertions: failCounts.size,
  };
}

export interface AssertionRow {
  name: string;
  target: string;
  passRate: number;
  trend: InvocationState[];
  lastState: InvocationState;
  lastFailure?: { invocationId: string; time: string; error?: string };
  totalExecutions: number;
  firstSeen?: string;
  lastSeen?: string;
}

export function computeAssertionsTable(
  invocationsWithActions: WorkflowInvocationWithActions[],
): AssertionRow[] {
  const map = new Map<
    string,
    {
      executions: Array<{ state: InvocationState; time: string; invId: string; error?: string }>;
    }
  >();

  const sortedAsc = [...invocationsWithActions].sort(
    (a, b) =>
      new Date(a.startTime ?? a.createTime).getTime() -
      new Date(b.startTime ?? b.createTime).getTime(),
  );

  for (const run of sortedAsc) {
    for (const a of run.actions) {
      if (a.type !== "ASSERTION") continue;
      const entry = map.get(a.target.full) ?? { executions: [] };
      entry.executions.push({
        state: a.state,
        time: run.startTime ?? run.createTime,
        invId: run.id,
        error: a.failureReason,
      });
      map.set(a.target.full, entry);
    }
  }

  return Array.from(map.entries())
    .map(([fullName, entry]) => {
      const runs = entry.executions;
      const total = runs.length;
      const ok = runs.filter((r) => r.state === "SUCCEEDED").length;
      const last = runs[runs.length - 1];
      const lastFailure = [...runs].reverse().find((r) => r.state === "FAILED");
      return {
        name: fullName.split(".").slice(-1)[0] ?? fullName,
        target: fullName,
        passRate: total > 0 ? (ok / total) * 100 : 0,
        trend: runs.slice(-20).map((r) => r.state),
        lastState: last?.state ?? "UNKNOWN",
        lastFailure: lastFailure
          ? {
              invocationId: lastFailure.invId,
              time: lastFailure.time,
              error: lastFailure.error,
            }
          : undefined,
        totalExecutions: total,
        firstSeen: runs[0]?.time,
        lastSeen: last?.time,
      } satisfies AssertionRow;
    })
    .sort((a, b) => a.passRate - b.passRate);
}

export interface AssertionKpis {
  totalAssertions: number;
  overallPassRate: number;
  currentlyFailing: number;
  mostFlakyAssertion?: string;
  mostFlakyAlternations: number;
}

/** Alternation count across run order: number of transitions SUCCEEDED<->FAILED. */
export function computeAssertionFlakiness(
  assertionHistory: InvocationState[],
): number {
  let alt = 0;
  for (let i = 1; i < assertionHistory.length; i++) {
    const prev = assertionHistory[i - 1];
    const curr = assertionHistory[i];
    if (
      (prev === "SUCCEEDED" && curr === "FAILED") ||
      (prev === "FAILED" && curr === "SUCCEEDED")
    ) {
      alt++;
    }
  }
  return alt;
}

export function computeAssertionKpis(
  invocationsWithActions: WorkflowInvocationWithActions[],
): AssertionKpis {
  const table = computeAssertionsTable(invocationsWithActions);
  let total = 0;
  let ok = 0;
  let currentlyFailing = 0;
  let mostFlaky: { name: string; alt: number } | undefined;

  for (const row of table) {
    total += row.totalExecutions;
    ok += Math.round((row.passRate / 100) * row.totalExecutions);
    if (row.lastState === "FAILED") currentlyFailing++;
    const alt = computeAssertionFlakiness(row.trend);
    if (!mostFlaky || alt > mostFlaky.alt) mostFlaky = { name: row.name, alt };
  }

  return {
    totalAssertions: table.length,
    overallPassRate: total > 0 ? (ok / total) * 100 : 0,
    currentlyFailing,
    mostFlakyAssertion: mostFlaky?.name,
    mostFlakyAlternations: mostFlaky?.alt ?? 0,
  };
}

/**
 * Compute the staleness status for each scheduled workflow.
 *
 * Joins configs to invocations on `WorkflowInvocation.workflowConfig`,
 * derives the expected interval from the cron expression (delta between two
 * consecutive next firings), then classifies each config as:
 *   ok      — last run within 1× the interval
 *   late    — between 1× and 2× the interval
 *   stale   — over 2× the interval (likely broken)
 *   never   — config exists but has no invocation in the join window
 *   disabled — config has `disabled: true`
 *   no_cron — config has no cron schedule (manual trigger only)
 *   invalid_cron — cron expression failed to parse
 */
export function computeScheduleStatuses(
  configs: WorkflowConfig[],
  invocations: WorkflowInvocation[],
  now: number = Date.now(),
): ScheduleStatus[] {
  const latestByConfig = new Map<string, WorkflowInvocation>();
  for (const inv of invocations) {
    const ref = inv.workflowConfig;
    if (!ref) continue;
    const existing = latestByConfig.get(ref);
    const t = new Date(inv.startTime ?? inv.createTime).getTime();
    if (
      !existing ||
      new Date(existing.startTime ?? existing.createTime).getTime() < t
    ) {
      latestByConfig.set(ref, inv);
    }
  }

  return configs.map((config): ScheduleStatus => {
    if (config.disabled) {
      return { config, statusKind: "disabled" };
    }
    if (!config.cronSchedule) {
      const lastInvocation = latestByConfig.get(config.name);
      return {
        config,
        lastInvocation,
        statusKind: lastInvocation ? "ok" : "no_cron",
      };
    }

    let nextExpectedAt: string | undefined;
    let expectedIntervalMs: number | undefined;
    let prevExpectedMs: number | undefined;
    let secondPrevExpectedMs: number | undefined;
    try {
      const parsed = CronExpressionParser.parse(config.cronSchedule, {
        currentDate: new Date(now),
        tz: config.timeZone || "UTC",
      });
      nextExpectedAt = parsed.next().toISOString() ?? undefined;

      // Walk backwards from `now` to learn the most-recent and second-most-
      // recent times the cron *should have* fired. The gap between the two
      // is a typical recent interval; this is non-uniform-cron-friendly
      // (business-hours, weekday-only, twice-daily, etc.) where the gap
      // between two future firings can collapse to the smallest intra-block
      // step and badly distort a static-interval ratio.
      const prevParsed = CronExpressionParser.parse(config.cronSchedule, {
        currentDate: new Date(now),
        tz: config.timeZone || "UTC",
      });
      try {
        prevExpectedMs = prevParsed.prev().getTime();
        secondPrevExpectedMs = prevParsed.prev().getTime();
        if (
          prevExpectedMs != null &&
          secondPrevExpectedMs != null &&
          prevExpectedMs > secondPrevExpectedMs
        ) {
          expectedIntervalMs = prevExpectedMs - secondPrevExpectedMs;
        }
      } catch {
        // No prior firings (cron was authored to start in the future).
      }
    } catch {
      return { config, statusKind: "invalid_cron" };
    }

    const lastInvocation = latestByConfig.get(config.name);
    if (!lastInvocation) {
      return {
        config,
        nextExpectedAt,
        expectedIntervalMs,
        statusKind: "never",
      };
    }

    const lastRunMs = new Date(
      lastInvocation.startTime ?? lastInvocation.createTime,
    ).getTime();

    // Count how many *expected* firings have elapsed strictly between the
    // last actual run and now. 0 → on time; 1 → late (one fire missed but
    // still within tolerance); ≥ 2 → stale.
    let missedFires = 0;
    if (prevExpectedMs != null && prevExpectedMs > lastRunMs) {
      missedFires = 1;
      try {
        const counter = CronExpressionParser.parse(config.cronSchedule, {
          currentDate: new Date(prevExpectedMs),
          tz: config.timeZone || "UTC",
        });
        const MAX_MISSED = 100;
        while (missedFires < MAX_MISSED) {
          const p = counter.prev().getTime();
          if (p <= lastRunMs) break;
          missedFires++;
        }
      } catch {
        // No more prior fires available — keep current count.
      }
    }

    const statusKind: ScheduleStatusKind =
      missedFires >= 2 ? "stale" : missedFires === 1 ? "late" : "ok";

    return {
      config,
      lastInvocation,
      expectedIntervalMs,
      nextExpectedAt,
      stalenessRatio: missedFires,
      statusKind,
    };
  });
}

export function countStaleSchedules(statuses: ScheduleStatus[]): number {
  return statuses.filter((s) => s.statusKind === "stale").length;
}

/**
 * Decide repo-level compilation health from a list of recent compilation
 * results (newest first). Looks at:
 *   - "currently_broken" if the most recent compilation has errors
 *   - "recently_broken" if any compilation in the window had errors but the
 *     latest is clean
 *   - "healthy" if every compilation in the window is clean
 *   - "no_data" if there are no compilations at all
 */
export function computeCompilationHealth(
  compilations: CompilationResult[],
): CompilationHealth {
  if (compilations.length === 0) {
    return { kind: "no_data", failureCountInWindow: 0 };
  }
  const sorted = [...compilations].sort(
    (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime(),
  );
  const latest = sorted[0]!;
  const failed = sorted.filter((c) => c.compilationErrors.length > 0);
  const succeeded = sorted.filter((c) => c.compilationErrors.length === 0);
  const lastSuccessfulAt = succeeded[0]?.createTime;

  if (latest.compilationErrors.length > 0) {
    return {
      kind: "currently_broken",
      latest,
      lastSuccessfulAt,
      failureCountInWindow: failed.length,
    };
  }
  if (failed.length > 0) {
    return {
      kind: "recently_broken",
      latest,
      lastSuccessfulAt: latest.createTime,
      failureCountInWindow: failed.length,
    };
  }
  return {
    kind: "healthy",
    latest,
    lastSuccessfulAt: latest.createTime,
    failureCountInWindow: 0,
  };
}

export interface QualityTimelinePoint {
  invocationId: string;
  /** Unix ms of invocation start. */
  time: number;
  /** Assertion pass rate for this run, 0–100. */
  passRate: number;
  total: number;
  succeeded: number;
  failed: number;
  runState: InvocationState;
}

/**
 * Per-invocation assertion pass-rate, ordered chronologically.
 * Used to render "data quality over time" — one point per run, useful for
 * spotting regressions or slow drift.
 *
 * Runs with zero assertions are skipped (nothing to plot).
 */
export function computeAssertionQualityTimeline(
  invocations: WorkflowInvocationWithActions[],
): QualityTimelinePoint[] {
  return invocations
    .filter((i) => (i.assertionsTotal ?? 0) > 0)
    .map((i) => {
      const total = i.assertionsTotal ?? 0;
      const ok = i.assertionsSucceeded ?? 0;
      const failed = i.assertionsFailed ?? 0;
      const time = new Date(i.startTime ?? i.createTime).getTime();
      return {
        invocationId: i.id,
        time,
        passRate: total > 0 ? (ok / total) * 100 : 0,
        total,
        succeeded: ok,
        failed,
        runState: i.state,
      } satisfies QualityTimelinePoint;
    })
    .sort((a, b) => a.time - b.time);
}

