/**
 * Converts raw Dataform API shapes to the narrower domain types
 * used by the UI. Tolerant of missing/unknown fields — per spec,
 * unknown values become "—" in the UI rather than crashing.
 */
import type {
  ActionType,
  InvocationActionMini,
  InvocationState,
  InvocationTrigger,
  Target,
  WorkflowInvocation,
  WorkflowInvocationWithActions,
} from "./types";

type AnyRecord = Record<string, unknown>;

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function toIso(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v && "seconds" in (v as AnyRecord)) {
    const secs = asNumber((v as AnyRecord).seconds);
    if (secs != null) return new Date(secs * 1000).toISOString();
  }
  return undefined;
}

function normalizeState(s: unknown): InvocationState {
  const v = asString(s)?.toUpperCase();
  switch (v) {
    case "SUCCEEDED":
    case "FAILED":
    case "RUNNING":
    case "CANCELLED":
    case "CANCELING":
    case "SKIPPED":
      return v;
    default:
      return "UNKNOWN";
  }
}

function normalizeTrigger(raw: AnyRecord): InvocationTrigger {
  if (raw.invocationConfig && typeof raw.invocationConfig === "object") return "manual";
  // The API surfaces schedule-trigger info via a workflowConfig reference.
  const wfCfg = raw.workflowConfig;
  if (typeof wfCfg === "string" && wfCfg.length > 0) return "scheduled";
  return "manual";
}

/**
 * WorkflowInvocationAction doesn't carry the compiled action type (table/view/
 * assertion/…) — only its execution mechanism (bigqueryAction/notebookAction).
 * To get the true type we'd have to join against CompilationResultAction,
 * which costs an extra API call per invocation.
 *
 * Heuristic used here: Dataform puts assertions in a `dataform_assertions`
 * dataset (or configurable, but always contains "assertion"), and user-level
 * assertion targets typically start with `assert_`. Good enough for 99% of
 * real pipelines; everything else defaults to TABLE if it ran on BigQuery.
 */
function normalizeActionType(target: Target, raw: AnyRecord): ActionType {
  const schema = target.schema?.toLowerCase() ?? "";
  const name = target.name?.toLowerCase() ?? "";
  if (schema.includes("assertion") || name.startsWith("assert_")) return "ASSERTION";
  if (raw.notebookAction) return "OPERATIONS";
  if (raw.dataPreparationAction) return "OPERATIONS";
  if (raw.bigqueryAction) return "TABLE";
  return "UNKNOWN";
}

function parseTarget(raw: unknown): Target {
  if (!raw || typeof raw !== "object") return { full: "—", name: "—" };
  const r = raw as AnyRecord;
  const database = asString(r.database);
  const schema = asString(r.schema);
  const name = asString(r.name) ?? "—";
  const parts = [database, schema, name].filter(Boolean) as string[];
  return { full: parts.join("."), database, schema, name };
}

function computeDurationMs(
  startTime: string | undefined,
  endTime: string | undefined,
): number | undefined {
  if (!startTime) return undefined;
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined;
  return Math.max(0, end - start);
}

function shortIdFromName(name: string | undefined): string {
  if (!name) return "unknown";
  const idx = name.lastIndexOf("/");
  return idx >= 0 ? name.slice(idx + 1) : name;
}

export function adaptWorkflowInvocation(raw: AnyRecord): WorkflowInvocation {
  const name = asString(raw.name) ?? "";
  const state = normalizeState(raw.state);
  const createTime =
    toIso(raw.invocationTiming && (raw.invocationTiming as AnyRecord).startTime) ??
    toIso(raw.createTime) ??
    new Date().toISOString();
  const startTime =
    toIso(raw.invocationTiming && (raw.invocationTiming as AnyRecord).startTime) ??
    toIso(raw.startTime);
  const endTime =
    toIso(raw.invocationTiming && (raw.invocationTiming as AnyRecord).endTime) ??
    toIso(raw.endTime);
  const durationMs = computeDurationMs(startTime ?? createTime, endTime);

  return {
    id: shortIdFromName(name),
    name,
    state,
    trigger: normalizeTrigger(raw),
    createTime,
    startTime,
    endTime,
    durationMs,
    commitSha: asString(
      raw.resolvedCompilationResult &&
        (raw.resolvedCompilationResult as AnyRecord).gitCommitish,
    ),
    compilationResultName: asString(raw.compilationResult),
  };
}

export function adaptInvocationAction(raw: AnyRecord): InvocationActionMini {
  const state = normalizeState(raw.state);
  const startTime = toIso(
    raw.invocationTiming && (raw.invocationTiming as AnyRecord).startTime,
  );
  const endTime = toIso(raw.invocationTiming && (raw.invocationTiming as AnyRecord).endTime);
  const target = parseTarget(raw.canonicalTarget ?? raw.target);
  return {
    target,
    type: normalizeActionType(target, raw),
    state,
    startTime,
    endTime,
    durationMs: computeDurationMs(startTime, endTime),
    failureReason: asString(raw.failureReason),
    compiledSql: asString(raw.bigqueryAction && (raw.bigqueryAction as AnyRecord).sqlScript),
    dependencyTargets: [],
  };
}

export function summarizeActions(
  inv: WorkflowInvocation,
  actions: InvocationActionMini[],
): WorkflowInvocationWithActions {
  let succeeded = 0;
  let failed = 0;
  let running = 0;
  let skipped = 0;
  let assertionsTotal = 0;
  let assertionsFailed = 0;
  let assertionsSucceeded = 0;
  for (const a of actions) {
    if (a.state === "SUCCEEDED") succeeded++;
    else if (a.state === "FAILED") failed++;
    else if (a.state === "RUNNING") running++;
    else if (a.state === "SKIPPED") skipped++;
    if (a.type === "ASSERTION") {
      assertionsTotal++;
      if (a.state === "FAILED") assertionsFailed++;
      else if (a.state === "SUCCEEDED") assertionsSucceeded++;
    }
  }
  return {
    ...inv,
    actions,
    actionsTotal: actions.length,
    actionsSucceeded: succeeded,
    actionsFailed: failed,
    actionsRunning: running,
    actionsSkipped: skipped,
    assertionsTotal,
    assertionsSucceeded,
    assertionsFailed,
  };
}
