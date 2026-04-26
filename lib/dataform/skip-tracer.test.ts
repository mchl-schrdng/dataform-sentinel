import { describe, expect, it } from "vitest";
import { formatSkipReason, traceSkippedActions } from "./skip-tracer";
import type {
  InvocationActionMini,
  InvocationState,
  WorkflowInvocationWithActions,
} from "./types";

function action(
  full: string,
  state: InvocationState,
  deps: string[] = [],
): InvocationActionMini {
  const parts = full.split(".");
  return {
    target: {
      full,
      schema: parts[0],
      name: parts[1] ?? full,
    },
    type: "TABLE",
    state,
    dependencyTargets: deps,
  };
}

function inv(
  state: InvocationState,
  actions: InvocationActionMini[],
): WorkflowInvocationWithActions {
  return {
    id: "inv",
    name: "x",
    state,
    trigger: "scheduled",
    createTime: new Date().toISOString(),
    startTime: new Date().toISOString(),
    actions,
    actionsTotal: actions.length,
    actionsSucceeded: actions.filter((a) => a.state === "SUCCEEDED").length,
    actionsFailed: actions.filter((a) => a.state === "FAILED").length,
    actionsRunning: actions.filter((a) => a.state === "RUNNING").length,
    actionsSkipped: actions.filter((a) => a.state === "SKIPPED").length,
    assertionsTotal: 0,
    assertionsSucceeded: 0,
    assertionsFailed: 0,
  };
}

describe("traceSkippedActions", () => {
  it("returns empty map when nothing is skipped", () => {
    const result = traceSkippedActions(
      inv("SUCCEEDED", [action("a.x", "SUCCEEDED"), action("a.y", "SUCCEEDED")]),
    );
    expect(result.size).toBe(0);
  });

  it("traces a direct failed parent (distance 1)", () => {
    const r = traceSkippedActions(
      inv("FAILED", [
        action("a.parent", "FAILED"),
        action("a.child", "SKIPPED", ["a.parent"]),
      ]),
    );
    expect(r.get("a.child")).toEqual({
      kind: "upstream_failed",
      blockedBy: "a.parent",
      distance: 1,
    });
  });

  it("traces transitively (distance 2)", () => {
    const r = traceSkippedActions(
      inv("FAILED", [
        action("a.broken", "FAILED"),
        action("a.mid", "SKIPPED", ["a.broken"]),
        action("a.leaf", "SKIPPED", ["a.mid"]),
      ]),
    );
    expect(r.get("a.leaf")).toEqual({
      kind: "upstream_failed",
      blockedBy: "a.broken",
      distance: 2,
    });
  });

  it("picks the closest failed in a diamond, alphabetic tiebreak", () => {
    // Both bravo and alpha are FAILED at distance 1 from `c.leaf`.
    const r = traceSkippedActions(
      inv("FAILED", [
        action("a.alpha", "FAILED"),
        action("a.bravo", "FAILED"),
        action("c.leaf", "SKIPPED", ["a.bravo", "a.alpha"]),
      ]),
    );
    expect(r.get("c.leaf")).toEqual({
      kind: "upstream_failed",
      blockedBy: "a.alpha",
      distance: 1,
    });
  });

  it("falls back when no failed ancestor exists", () => {
    const r = traceSkippedActions(
      inv("FAILED", [
        action("a.parent", "SUCCEEDED"),
        action("a.child", "SKIPPED", ["a.parent"]),
      ]),
    );
    expect(r.get("a.child")).toEqual({ kind: "no_failed_ancestor" });
  });

  it("labels every skipped action as run_cancelled when run is CANCELLED", () => {
    const r = traceSkippedActions(
      inv("CANCELLED", [
        action("a.broken", "FAILED"),
        action("a.mid", "SKIPPED", ["a.broken"]),
      ]),
    );
    expect(r.get("a.mid")).toEqual({ kind: "run_cancelled" });
  });

  it("does not crash on missing dependency edges", () => {
    const r = traceSkippedActions(
      inv("FAILED", [action("a.orphan", "SKIPPED", ["does.not.exist"])]),
    );
    expect(r.get("a.orphan")?.kind).toBe("no_failed_ancestor");
  });
});

describe("formatSkipReason", () => {
  it("renders direct blocker without level suffix", () => {
    expect(
      formatSkipReason({ kind: "upstream_failed", blockedBy: "a.x", distance: 1 }),
    ).toBe("Blocked by a.x");
  });
  it("includes level count beyond distance 1", () => {
    expect(
      formatSkipReason({ kind: "upstream_failed", blockedBy: "a.x", distance: 3 }),
    ).toBe("Blocked by a.x (3 levels up)");
  });
  it("renders cancellation and fallback strings", () => {
    expect(formatSkipReason({ kind: "run_cancelled" })).toBe("Skipped: run cancelled");
    expect(formatSkipReason({ kind: "no_failed_ancestor" })).toBe(
      "Skipped: upstream conditions not met",
    );
  });
});
