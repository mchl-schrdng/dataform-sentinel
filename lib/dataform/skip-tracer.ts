/**
 * Skip-trace: explain why each SKIPPED action got skipped, by walking the
 * dependency graph upstream until finding a FAILED ancestor.
 */
import type {
  InvocationActionMini,
  InvocationState,
  WorkflowInvocationWithActions,
} from "./types";

export type SkipReasonKind =
  | "upstream_failed"
  | "run_cancelled"
  | "no_failed_ancestor";

export interface SkipReason {
  kind: SkipReasonKind;
  /** Full target name of the closest failed ancestor (when applicable). */
  blockedBy?: string;
  /** BFS distance from the skipped action to its blocker. */
  distance?: number;
}

/**
 * For each SKIPPED action, return a SkipReason explaining why.
 *
 * - If the run state is CANCELLED/CANCELING, every skipped action is labelled
 *   "run_cancelled" without further graph traversal.
 * - Otherwise, BFS upstream via `dependencyTargets`. The first FAILED ancestor
 *   wins. Ties (multiple at the same distance) are broken alphabetically by
 *   target name for determinism.
 * - If no FAILED ancestor is found, return "no_failed_ancestor".
 */
export function traceSkippedActions(
  invocation: WorkflowInvocationWithActions,
): Map<string, SkipReason> {
  const out = new Map<string, SkipReason>();
  const actions = invocation.actions;
  const byTarget = new Map<string, InvocationActionMini>();
  for (const a of actions) byTarget.set(a.target.full, a);

  const runCancelled =
    invocation.state === "CANCELLED" || invocation.state === "CANCELING";

  for (const a of actions) {
    if (a.state !== "SKIPPED") continue;

    if (runCancelled) {
      out.set(a.target.full, { kind: "run_cancelled" });
      continue;
    }

    const reason = bfsForFailedAncestor(a, byTarget);
    out.set(a.target.full, reason);
  }
  return out;
}

function bfsForFailedAncestor(
  start: InvocationActionMini,
  byTarget: Map<string, InvocationActionMini>,
): SkipReason {
  const seen = new Set<string>([start.target.full]);
  // Each frontier level is a list of targets at the same BFS distance.
  let frontier: string[] = [...(start.dependencyTargets ?? [])].filter(Boolean);
  let distance = 1;
  while (frontier.length > 0) {
    // Among the current level, prefer FAILED ancestors. Tie-break alphabetically.
    const failedHere = frontier
      .map((t) => byTarget.get(t))
      .filter((a): a is InvocationActionMini => a !== undefined && a.state === "FAILED")
      .sort((a, b) => a.target.full.localeCompare(b.target.full));
    if (failedHere.length > 0) {
      return {
        kind: "upstream_failed",
        blockedBy: failedHere[0]!.target.full,
        distance,
      };
    }

    const next: string[] = [];
    for (const t of frontier) {
      if (seen.has(t)) continue;
      seen.add(t);
      const action = byTarget.get(t);
      if (!action) continue;
      for (const dep of action.dependencyTargets ?? []) {
        if (!seen.has(dep)) next.push(dep);
      }
    }
    frontier = next;
    distance++;
  }
  return { kind: "no_failed_ancestor" };
}

/**
 * Render-friendly text for a SkipReason. UI components can use this directly
 * or compose their own (e.g. with a hyperlink on `blockedBy`).
 */
export function formatSkipReason(reason: SkipReason): string {
  if (reason.kind === "run_cancelled") return "Skipped: run cancelled";
  if (reason.kind === "no_failed_ancestor")
    return "Skipped: upstream conditions not met";
  if (reason.distance && reason.distance > 1) {
    return `Blocked by ${reason.blockedBy} (${reason.distance} levels up)`;
  }
  return `Blocked by ${reason.blockedBy}`;
}

// Re-export the Mini-Action type to keep imports tidy in callers.
export type { InvocationState };
