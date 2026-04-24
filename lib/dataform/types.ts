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

export type PeriodKey = "1h" | "24h" | "7d" | "30d" | "90d";

export const PERIOD_MS: Record<PeriodKey, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};
