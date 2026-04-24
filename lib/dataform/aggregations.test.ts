import { describe, expect, it } from "vitest";
import {
  computeAssertionFlakiness,
  computeAssertionQualityTimeline,
  computeAssertionsHeatmap,
  computeRunsTimeline,
  computeTopFailingActions,
  computeDurationHistogram,
} from "./aggregations";
import type {
  InvocationActionMini,
  InvocationState,
  WorkflowInvocationWithActions,
} from "./types";

function mkInvocation(
  overrides: Partial<WorkflowInvocationWithActions>,
): WorkflowInvocationWithActions {
  const base: WorkflowInvocationWithActions = {
    id: "id",
    name: "projects/p/locations/l/repositories/r/workflowInvocations/id",
    state: "SUCCEEDED",
    trigger: "scheduled",
    createTime: new Date().toISOString(),
    startTime: new Date().toISOString(),
    durationMs: 60_000,
    actions: [],
    actionsTotal: 0,
    actionsSucceeded: 0,
    actionsFailed: 0,
    actionsRunning: 0,
    actionsSkipped: 0,
    assertionsTotal: 0,
    assertionsSucceeded: 0,
    assertionsFailed: 0,
  };
  return { ...base, ...overrides };
}

function mkAction(target: string, state: InvocationState, type = "TABLE"): InvocationActionMini {
  return {
    target: { full: target, name: target.split(".").pop() ?? target },
    type: type as InvocationActionMini["type"],
    state,
    durationMs: 30_000,
  };
}

describe("computeRunsTimeline", () => {
  it("includes only invocations within the window", () => {
    const now = Date.now();
    const invocations = [
      mkInvocation({ id: "recent", startTime: new Date(now - 60_000).toISOString() }),
      mkInvocation({ id: "old", startTime: new Date(now - 48 * 60 * 60 * 1000).toISOString() }),
    ];
    const result = computeRunsTimeline(invocations, "24h", now);
    expect(result.bars.map((b) => b.id)).toEqual(["recent"]);
    expect(result.end).toBe(now);
    expect(result.start).toBe(now - 24 * 60 * 60 * 1000);
  });

  it("preserves state on each bar", () => {
    const now = Date.now();
    const invocations = [
      mkInvocation({ id: "ok", state: "SUCCEEDED", startTime: new Date(now - 10_000).toISOString() }),
      mkInvocation({ id: "ko", state: "FAILED", startTime: new Date(now - 20_000).toISOString() }),
    ];
    const result = computeRunsTimeline(invocations, "1h", now);
    expect(result.bars.find((b) => b.id === "ok")?.state).toBe("SUCCEEDED");
    expect(result.bars.find((b) => b.id === "ko")?.state).toBe("FAILED");
  });
});

describe("computeAssertionsHeatmap", () => {
  it("sorts assertions by fail count desc and respects row cap", () => {
    const now = Date.now();
    const runs: WorkflowInvocationWithActions[] = [];
    for (let i = 0; i < 3; i++) {
      runs.push(
        mkInvocation({
          id: `r${i}`,
          startTime: new Date(now - i * 60_000).toISOString(),
          actions: [
            mkAction("assertions.a_fails_always", "FAILED", "ASSERTION"),
            mkAction("assertions.b_never_fails", "SUCCEEDED", "ASSERTION"),
            mkAction("assertions.c_fails_once", i === 0 ? "FAILED" : "SUCCEEDED", "ASSERTION"),
          ],
        }),
      );
    }
    const heatmap = computeAssertionsHeatmap(runs, 2, 10);
    expect(heatmap.assertions).toEqual([
      "assertions.a_fails_always",
      "assertions.c_fails_once",
    ]);
    expect(heatmap.cells).toHaveLength(heatmap.assertions.length * heatmap.runIds.length);
  });

  it("marks cells as NO_DATA when assertion missing from a run", () => {
    const now = Date.now();
    const runs: WorkflowInvocationWithActions[] = [
      mkInvocation({
        id: "r1",
        startTime: new Date(now).toISOString(),
        actions: [mkAction("assertions.x", "FAILED", "ASSERTION")],
      }),
      mkInvocation({
        id: "r2",
        startTime: new Date(now + 60_000).toISOString(),
        actions: [],
      }),
    ];
    const heatmap = computeAssertionsHeatmap(runs, 5, 5);
    const xR2 = heatmap.cells.find(
      (c) => c.assertion === "assertions.x" && c.invocationId === "r2",
    );
    expect(xR2?.state).toBe("NO_DATA");
  });
});

describe("computeAssertionFlakiness", () => {
  it("counts every transition between succeeded and failed", () => {
    const history: InvocationState[] = ["SUCCEEDED", "FAILED", "SUCCEEDED", "FAILED", "FAILED"];
    expect(computeAssertionFlakiness(history)).toBe(3);
  });

  it("returns zero for a monotone series", () => {
    expect(computeAssertionFlakiness(["SUCCEEDED", "SUCCEEDED", "SUCCEEDED"])).toBe(0);
    expect(computeAssertionFlakiness(["FAILED", "FAILED"])).toBe(0);
  });

  it("ignores non-assertion terminal states like SKIPPED", () => {
    // Currently only SUCCEEDED<->FAILED transitions are counted; other states
    // break the chain but do not add to the count.
    const history: InvocationState[] = ["SUCCEEDED", "SKIPPED", "FAILED"];
    expect(computeAssertionFlakiness(history)).toBe(0);
  });
});

describe("computeTopFailingActions", () => {
  it("ranks by fail rate and excludes successful actions", () => {
    const runs: WorkflowInvocationWithActions[] = [
      mkInvocation({
        id: "r1",
        actions: [
          mkAction("analytics.a", "FAILED"),
          mkAction("analytics.b", "SUCCEEDED"),
        ],
      }),
      mkInvocation({
        id: "r2",
        actions: [
          mkAction("analytics.a", "FAILED"),
          mkAction("analytics.b", "FAILED"),
        ],
      }),
      mkInvocation({
        id: "r3",
        actions: [
          mkAction("analytics.a", "SUCCEEDED"),
          mkAction("analytics.b", "SUCCEEDED"),
        ],
      }),
    ];
    const top = computeTopFailingActions(runs, 5);
    expect(top.map((t) => t.target)).toEqual(["analytics.a", "analytics.b"]);
    expect(top[0]?.failRate).toBeCloseTo(66.66, 1);
    expect(top[1]?.failRate).toBeCloseTo(33.33, 1);
  });
});

describe("computeDurationHistogram", () => {
  it("produces the requested bucket count and p95 marker", () => {
    const invocations = Array.from({ length: 20 }, (_, i) =>
      mkInvocation({ id: `i${i}`, durationMs: (i + 1) * 10_000 }),
    );
    const h = computeDurationHistogram(invocations, 5);
    expect(h.buckets).toHaveLength(5);
    expect(h.p95Ms).toBeGreaterThan(0);
    expect(h.buckets.reduce((a, b) => a + b.count, 0)).toBe(20);
  });
});

describe("computeAssertionQualityTimeline", () => {
  it("emits one point per run with assertions, sorted chronologically", () => {
    const now = Date.now();
    const runs = [
      mkInvocation({
        id: "r2",
        startTime: new Date(now - 60_000).toISOString(),
        assertionsTotal: 10,
        assertionsSucceeded: 8,
        assertionsFailed: 2,
      }),
      mkInvocation({
        id: "r1",
        startTime: new Date(now - 120_000).toISOString(),
        assertionsTotal: 10,
        assertionsSucceeded: 10,
        assertionsFailed: 0,
      }),
    ];
    const out = computeAssertionQualityTimeline(runs);
    expect(out.map((p) => p.invocationId)).toEqual(["r1", "r2"]);
    expect(out[0]?.passRate).toBe(100);
    expect(out[1]?.passRate).toBe(80);
  });

  it("skips runs with zero assertions", () => {
    const now = Date.now();
    const runs = [
      mkInvocation({ id: "no-asserts", startTime: new Date(now).toISOString(), assertionsTotal: 0 }),
      mkInvocation({
        id: "has-asserts",
        startTime: new Date(now - 10_000).toISOString(),
        assertionsTotal: 4,
        assertionsSucceeded: 4,
      }),
    ];
    const out = computeAssertionQualityTimeline(runs);
    expect(out).toHaveLength(1);
    expect(out[0]?.invocationId).toBe("has-asserts");
  });
});
