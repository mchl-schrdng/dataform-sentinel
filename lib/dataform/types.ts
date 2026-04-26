/**
 * Domain types used throughout the app.
 *
 * These are intentionally a narrower, UI-friendly projection of the
 * Dataform API response shapes — the adapter in `client.ts` converts
 * raw API objects into these.
 */

export type InvocationState =
  | "SUCCEEDED"
  | "FAILED"
  | "RUNNING"
  | "CANCELLED"
  | "CANCELING"
  | "SKIPPED"
  | "UNKNOWN";

export type InvocationTrigger = "manual" | "scheduled" | "api" | "unknown";

export type ActionType =
  | "DECLARATION"
  | "TABLE"
  | "VIEW"
  | "INCREMENTAL_TABLE"
  | "OPERATIONS"
  | "ASSERTION"
  | "UNKNOWN";

export interface Target {
  /** Fully qualified: dataset.table (or dataset.schema.table) */
  full: string;
  database?: string;
  schema?: string;
  name: string;
}

export interface InvocationActionMini {
  target: Target;
  type: ActionType;
  state: InvocationState;
  startTime?: string;
  endTime?: string;
  durationMs?: number;
  failureReason?: string;
  bytesBilled?: number;
  compiledSql?: string;
  /** Dependency target full names (used for DAG edges). */
  dependencyTargets?: string[];
}

export interface WorkflowInvocation {
  /** Short id (the part after /workflowInvocations/). */
  id: string;
  /** Full resource name (used for API mutations). */
  name: string;
  state: InvocationState;
  trigger: InvocationTrigger;
  /** ISO timestamp. */
  createTime: string;
  /** ISO timestamp. */
  startTime?: string;
  /** ISO timestamp. */
  endTime?: string;
  durationMs?: number;
  commitSha?: string;
  compilationResultName?: string;
  /**
   * Full resource name of the WorkflowConfig that triggered this invocation,
   * if any. Used to join invocations back to their schedule.
   */
  workflowConfig?: string;

  /** Summary counts. Populated when we have fetched actions. */
  actionsTotal?: number;
  actionsSucceeded?: number;
  actionsFailed?: number;
  actionsRunning?: number;
  actionsSkipped?: number;

  assertionsTotal?: number;
  assertionsSucceeded?: number;
  assertionsFailed?: number;
}

export interface WorkflowInvocationWithActions extends WorkflowInvocation {
  actions: InvocationActionMini[];
}

export interface InvocationsPage {
  invocations: WorkflowInvocation[];
  nextPageToken?: string;
}

/**
 * A scheduled workflow defined on a Dataform repository. Equivalent to
 * `google.cloud.dataform.v1.WorkflowConfig`, projected into the fields we
 * actually use.
 */
export interface WorkflowConfig {
  /** Full resource name. */
  name: string;
  /** Short id (segment after /workflowConfigs/). */
  id: string;
  /** Cron expression in standard 5-field format. */
  cronSchedule?: string;
  /** IANA timezone name (e.g. "Europe/Paris"). Defaults to UTC. */
  timeZone?: string;
  /** Compilation source (release config resource name). */
  releaseConfig?: string;
  /** Whether this schedule is paused. */
  disabled: boolean;
  createTime?: string;
  updateTime?: string;
}

export type ScheduleStatusKind =
  | "ok"
  | "late"
  | "stale"
  | "never"
  | "disabled"
  | "no_cron"
  | "invalid_cron";

export interface ScheduleStatus {
  config: WorkflowConfig;
  /** Latest invocation triggered by this config, if any. */
  lastInvocation?: WorkflowInvocation;
  /** Expected interval between firings, derived from the cron expression. */
  expectedIntervalMs?: number;
  /** Next firing time computed from the cron expression. ISO timestamp. */
  nextExpectedAt?: string;
  /** (now - lastInvocationTime) / expectedIntervalMs. Undefined if no last run. */
  stalenessRatio?: number;
  statusKind: ScheduleStatusKind;
}

/** A single error from a failed compilation. */
export interface CompilationError {
  message: string;
  /** File path within the Dataform project (e.g. "definitions/marketing.sqlx"). */
  path?: string;
  /** Target referenced by the error, if action-scoped. */
  actionTarget?: { database?: string; schema?: string; name?: string; full?: string };
  stack?: string;
}

export interface CompilationResult {
  /** Full resource name. */
  name: string;
  /** Short id (segment after /compilationResults/). */
  id: string;
  createTime: string;
  /** Empty array means a successful compilation. */
  compilationErrors: CompilationError[];
  gitCommitish?: string;
  workspace?: string;
  releaseConfig?: string;
  resolvedGitCommitSha?: string;
  dataformCoreVersion?: string;
}

export type CompilationHealthKind =
  | "healthy"
  | "currently_broken"
  | "recently_broken"
  | "no_data";

export interface CompilationHealth {
  kind: CompilationHealthKind;
  /** Most recent compilation, if any. */
  latest?: CompilationResult;
  /** Most recent successful compilation. */
  lastSuccessfulAt?: string;
  /** Number of failed compilations within the inspected window. */
  failureCountInWindow: number;
}

/**
 * The compiled view of an action: tags + canonical type. Lives in the
 * compilationResult, joined back to runtime actions by target.full.
 */
export interface CompiledAction {
  tags: string[];
  type: ActionType;
  filePath?: string;
}

/** Sentinel pseudo-tag for actions whose `tags[]` is empty. */
export const UNTAGGED_TAG = "untagged";

export type PeriodKey = "1h" | "24h" | "7d" | "30d" | "90d";

export const PERIOD_MS: Record<PeriodKey, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};
