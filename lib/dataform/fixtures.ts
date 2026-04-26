/**
 * Deterministic fixture data used by SENTINEL_MOCK=1.
 * Everything is generated from a seeded PRNG so each boot is identical.
 */
import type {
  CompilationResult,
  CompiledAction,
  InvocationActionMini,
  InvocationState,
  InvocationTrigger,
  Target,
  WorkflowConfig,
  WorkflowInvocation,
  WorkflowInvocationWithActions,
} from "./types";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const ASSERTION_NAMES = [
  "assert_customer_pk_unique",
  "assert_orders_not_null",
  "assert_revenue_positive",
  "assert_session_ids_unique",
  "assert_event_ts_monotonic",
  "assert_utm_source_known",
  "assert_ltv_range_valid",
  "assert_country_iso_valid",
  "assert_attribution_window_28d",
  "assert_product_sku_exists",
  "assert_refund_amount_le_order",
  "assert_user_id_format",
  "assert_cohort_size_positive",
  "assert_experiment_variant_known",
  "assert_fiscal_period_valid",
];

const TABLE_NAMES = [
  "customer_orders_daily",
  "marketing_attribution_windows",
  "finance_revenue_recognition",
  "product_session_rollups_hourly",
  "ltv_cohorts_v2",
  "session_events_clean",
  "user_dim",
  "subscription_events",
  "churn_predictions",
];

const STAGING_NAMES = ["orders_clean", "users_enriched", "events_filtered"];
const RAW_NAMES = ["orders", "users", "events"];

function pick<T>(rng: () => number, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("pick() on empty array");
  const idx = Math.floor(rng() * arr.length);
  return arr[idx] as T;
}

function makeTarget(schema: string, name: string): Target {
  return { full: `${schema}.${name}`, schema, name };
}

function invocationState(rng: () => number, overrideFailRate?: number): InvocationState {
  const r = rng();
  const failRate = overrideFailRate ?? 0.08;
  if (r < 0.03) return "RUNNING";
  if (r < 0.03 + failRate) return "FAILED";
  if (r < 0.03 + failRate + 0.02) return "CANCELLED";
  return "SUCCEEDED";
}

function trigger(rng: () => number): InvocationTrigger {
  const r = rng();
  if (r < 0.75) return "scheduled";
  if (r < 0.95) return "manual";
  return "api";
}

/**
 * Build a synthetic action list for an invocation. The action set is
 * roughly: raw declarations -> staging tables -> analytics tables +
 * assertions. We vary assertion failure patterns across runs.
 */
function makeActions(
  rng: () => number,
  invState: InvocationState,
  runIndex: number,
): InvocationActionMini[] {
  const actions: InvocationActionMini[] = [];

  for (const name of RAW_NAMES) {
    actions.push({
      target: makeTarget("raw", name),
      type: "DECLARATION",
      state: "SUCCEEDED",
      durationMs: 0,
    });
  }

  for (const name of STAGING_NAMES) {
    const skipped = invState === "FAILED" && rng() < 0.2;
    actions.push({
      target: makeTarget("sta", name),
      type: pick(rng, ["TABLE", "VIEW"] as const),
      state: skipped ? "SKIPPED" : "SUCCEEDED",
      durationMs: skipped ? undefined : 10_000 + Math.floor(rng() * 40_000),
      dependencyTargets: RAW_NAMES.map((r) => `raw.${r}`),
    });
  }

  const analyticsNames = TABLE_NAMES.slice(0, 5);
  analyticsNames.forEach((name, i) => {
    let state: InvocationState = "SUCCEEDED";
    // The first analytics table occasionally fails when the invocation itself failed
    if (invState === "FAILED" && i === 0) state = "FAILED";
    else if (invState === "RUNNING" && i === 1) state = "RUNNING";
    else if (invState === "FAILED" && i > 0) state = "SKIPPED";
    actions.push({
      target: makeTarget("analytics", name),
      type: i % 3 === 0 ? "INCREMENTAL_TABLE" : "TABLE",
      state,
      durationMs:
        state === "SUCCEEDED"
          ? 30_000 + Math.floor(rng() * 180_000)
          : state === "RUNNING"
            ? undefined
            : state === "FAILED"
              ? 20_000 + Math.floor(rng() * 40_000)
              : undefined,
      failureReason:
        state === "FAILED"
          ? `BigQuery error in query operation:\nError: Type mismatch for column "order_total"\n  expected: NUMERIC(18,4)\n  found:    STRING\n  at raw.orders row 3,421`
          : undefined,
      bytesBilled: state === "SUCCEEDED" ? 100 * 1024 * 1024 * (1 + Math.floor(rng() * 9)) : undefined,
      compiledSql:
        state !== "SKIPPED"
          ? `-- Compiled SQL for analytics.${name}\nSELECT\n  o.order_id,\n  o.customer_id,\n  SUM(o.order_total) AS revenue\nFROM \`raw.orders\` AS o\nWHERE DATE(o.ordered_at) = CURRENT_DATE() - 1\nGROUP BY 1, 2\n`
          : undefined,
      // Chain analytics tables together so skip-trace can find the blocking
      // upstream when the first one fails. The first analytics depends on staging.
      dependencyTargets:
        i === 0
          ? STAGING_NAMES.map((n) => `sta.${n}`)
          : [`analytics.${analyticsNames[i - 1]}`],
    });
  });

  // Assertions. Vary failure per (run, assertion) so the heatmap has signal.
  const assertionsToFail = new Set<number>();
  if (invState === "FAILED") {
    assertionsToFail.add((runIndex * 3) % ASSERTION_NAMES.length);
    if (rng() < 0.4) assertionsToFail.add((runIndex * 7 + 1) % ASSERTION_NAMES.length);
  } else if (rng() < 0.08) {
    assertionsToFail.add((runIndex * 5) % ASSERTION_NAMES.length);
  }

  ASSERTION_NAMES.forEach((name, i) => {
    const state: InvocationState = assertionsToFail.has(i) ? "FAILED" : "SUCCEEDED";
    actions.push({
      target: makeTarget("assertions", name),
      type: "ASSERTION",
      state,
      durationMs: 1_000 + Math.floor(rng() * 6_000),
      failureReason:
        state === "FAILED"
          ? `Assertion failed: 7 rows did not match the expected condition\nquery: SELECT COUNT(*) FROM assertions.${name} WHERE failed = TRUE`
          : undefined,
      dependencyTargets: analyticsNames.map((n) => `analytics.${n}`),
    });
  });

  return actions;
}

export interface FixtureRepoSnapshot {
  invocations: WorkflowInvocationWithActions[];
  workflowConfigs: WorkflowConfig[];
  compilations: CompilationResult[];
  /** target.full → compiled metadata (tags, type). */
  compiledActions: Array<{ target: string; compiled: CompiledAction }>;
}

/**
 * Per-repo tag profiles. The map covers analytics targets only — staging/raw
 * inherit a smaller profile, assertions all carry "assertions". Repos absent
 * from this dictionary fall back to an empty-tag profile (everything untagged).
 */
const TAG_PROFILES: Record<string, Record<string, string[]>> = {
  "analytics-prod": {
    "sta.orders_clean": ["orders", "daily"],
    "sta.users_enriched": ["users", "daily"],
    "sta.events_filtered": ["events", "hourly"],
    "analytics.customer_orders_daily": ["orders", "daily", "marketing"],
    "analytics.marketing_attribution_windows": ["marketing", "daily"],
    "analytics.finance_revenue_recognition": ["finance", "daily"],
    "analytics.product_session_rollups_hourly": ["product", "hourly"],
    "analytics.ltv_cohorts_v2": ["marketing", "ltv"],
    "analytics.session_events_clean": ["product", "hourly"],
  },
  "marketing-attribution": {
    "sta.orders_clean": ["orders", "daily"],
    "sta.users_enriched": ["users", "daily"],
    "sta.events_filtered": ["events", "hourly"],
    "analytics.customer_orders_daily": ["marketing", "daily"],
    "analytics.marketing_attribution_windows": ["marketing", "attribution"],
    "analytics.finance_revenue_recognition": ["marketing", "daily"],
    "analytics.product_session_rollups_hourly": ["marketing", "hourly"],
    "analytics.ltv_cohorts_v2": ["marketing", "ltv"],
    "analytics.session_events_clean": ["marketing", "events"],
  },
  "finance-reporting": {
    "sta.orders_clean": ["finance", "daily"],
    "sta.users_enriched": ["finance", "daily"],
    "sta.events_filtered": ["finance", "hourly"],
    "analytics.customer_orders_daily": ["finance", "daily"],
    "analytics.marketing_attribution_windows": ["finance", "daily"],
    "analytics.finance_revenue_recognition": ["finance", "daily", "compliance"],
    "analytics.product_session_rollups_hourly": ["finance", "hourly"],
    "analytics.ltv_cohorts_v2": ["finance", "ltv"],
    "analytics.session_events_clean": ["finance", "events"],
  },
  "product-events": {
    "sta.orders_clean": ["product", "events"],
    "sta.users_enriched": ["product", "events"],
    "sta.events_filtered": ["product", "events", "hourly"],
    "analytics.customer_orders_daily": ["product", "daily"],
    "analytics.marketing_attribution_windows": ["product", "events"],
    "analytics.finance_revenue_recognition": ["product", "daily"],
    "analytics.product_session_rollups_hourly": ["product", "hourly"],
    "analytics.ltv_cohorts_v2": ["product", "ltv"],
    "analytics.session_events_clean": ["product", "events"],
  },
  "growth-experiments": {
    "sta.orders_clean": ["growth", "daily"],
    "sta.users_enriched": ["growth", "experiments"],
    "sta.events_filtered": ["growth", "experiments"],
    "analytics.customer_orders_daily": ["growth", "experiments"],
    "analytics.marketing_attribution_windows": ["growth", "marketing"],
    "analytics.finance_revenue_recognition": ["growth", "daily"],
    "analytics.product_session_rollups_hourly": ["growth", "experiments"],
    "analytics.ltv_cohorts_v2": ["growth", "ltv"],
    "analytics.session_events_clean": ["growth", "experiments"],
  },
  // ml-feature-store intentionally absent → exercises the all-untagged branch.
};

type CompilationSpec = {
  hoursAgo: number;
  failed: boolean;
  message?: string;
  path?: string;
  target?: string; // dot-separated db.schema.name
};

const COMPILATION_SPECS: Record<string, CompilationSpec[]> = {
  // Currently broken — latest failed.
  "analytics-prod": [
    {
      hoursAgo: 2,
      failed: true,
      message:
        'Type mismatch on column "order_total": expected NUMERIC, found STRING',
      path: "definitions/analytics/orders.sqlx",
      target: "my-gcp-project.analytics.customer_orders_daily",
    },
    {
      hoursAgo: 5,
      failed: true,
      message:
        'Type mismatch on column "order_total": expected NUMERIC, found STRING',
      path: "definitions/analytics/orders.sqlx",
      target: "my-gcp-project.analytics.customer_orders_daily",
    },
    { hoursAgo: 12, failed: false },
    { hoursAgo: 28, failed: false },
  ],
  // Recently broken — latest is clean but had failures earlier in the window.
  "marketing-attribution": [
    { hoursAgo: 1, failed: false },
    {
      hoursAgo: 6,
      failed: true,
      message: "ResolutionError: ref('utm_lookup') is not defined",
      path: "definitions/marketing/attribution.sqlx",
    },
    { hoursAgo: 18, failed: false },
  ],
  // Healthy — only successes.
  "finance-reporting": [
    { hoursAgo: 1, failed: false },
    { hoursAgo: 14, failed: false },
    { hoursAgo: 30, failed: false },
  ],
  "product-events": [
    { hoursAgo: 1, failed: false },
    { hoursAgo: 13, failed: false },
  ],
  // Repository-level error (no actionTarget).
  "growth-experiments": [
    {
      hoursAgo: 4,
      failed: true,
      message:
        "Cannot find module 'includes/utils.js' (referenced from definitions/main.sqlx)",
    },
    { hoursAgo: 30, failed: false },
  ],
  // No data — exercise the no_data branch.
  "ml-feature-store": [],
};

interface FixtureScheduleSpec {
  id: string;
  cronSchedule?: string;
  timeZone?: string;
  disabled?: boolean;
  /**
   * Controls which invocations get linked back to this config.
   *  - "recent": link the most recent invocations (→ status ok / late depending on cadence)
   *  - "stale":  link a single old invocation (≥ 3× the cadence ago)
   *  - "never":  never link any invocation (config has never run)
   */
  link: "recent" | "stale" | "never";
}

const SCHEDULE_SPECS: Record<string, FixtureScheduleSpec[]> = {
  "analytics-prod": [
    { id: "hourly-refresh", cronSchedule: "0 * * * *", link: "recent" },
    { id: "daily-rollups", cronSchedule: "0 2 * * *", timeZone: "Europe/Paris", link: "stale" },
  ],
  "marketing-attribution": [
    { id: "hourly-attribution", cronSchedule: "15 * * * *", link: "recent" },
    { id: "weekly-cohorts", cronSchedule: "0 4 * * 1", disabled: true, link: "never" },
  ],
  "finance-reporting": [
    { id: "daily-revenue", cronSchedule: "30 1 * * *", timeZone: "Europe/Paris", link: "stale" },
  ],
  "product-events": [
    { id: "every-15min", cronSchedule: "*/15 * * * *", link: "recent" },
  ],
  "growth-experiments": [
    { id: "experiment-rollups", cronSchedule: "0 */6 * * *", link: "never" },
  ],
  "ml-feature-store": [],
};

export function buildFixtureForTarget(
  targetKey: string,
  now: number = Date.now(),
): FixtureRepoSnapshot {
  const rng = mulberry32(hashSeed(targetKey));
  // Per-target bias so different cards have visibly different health.
  const failBias: Record<string, number> = {
    "analytics-prod": 0.07,
    "marketing-attribution": 0.03,
    "finance-reporting": 0.18,
    "product-events": 0.01,
    "growth-experiments": 0.02,
    "ml-feature-store": 0.02,
  };
  const bias = failBias[targetKey] ?? 0.08;

  const invocations: WorkflowInvocationWithActions[] = [];
  // Produce ~60 invocations spread over the last 7 days, newest first.
  const count = 60;
  const windowMs = 7 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const offset = Math.floor((windowMs / count) * i + rng() * 600_000);
    const start = now - offset;
    // First invocation may still be running for a small number of targets
    let state: InvocationState;
    if (i === 0 && targetKey === "marketing-attribution") state = "RUNNING";
    else state = invocationState(rng, bias);
    const durationMs =
      state === "RUNNING"
        ? now - start - 20_000
        : 60_000 + Math.floor(rng() * 540_000);
    const endIso = state === "RUNNING" ? undefined : new Date(start + durationMs).toISOString();
    const startIso = new Date(start).toISOString();
    const id = `${targetKey.slice(0, 4)}${(i + 1).toString(16).padStart(4, "0")}${(hashSeed(targetKey + i) & 0xffff).toString(16).padStart(4, "0")}`;
    const inv: WorkflowInvocation = {
      id,
      name: `projects/p/locations/l/repositories/${targetKey}/workflowInvocations/${id}`,
      state,
      trigger: trigger(rng),
      createTime: startIso,
      startTime: startIso,
      endTime: endIso,
      durationMs: state === "RUNNING" ? undefined : durationMs,
      commitSha: (hashSeed(targetKey + i) >>> 0).toString(16).slice(0, 7),
    };
    const actions = makeActions(rng, state, i);
    let succ = 0;
    let fail = 0;
    let running = 0;
    let skipped = 0;
    let assertionsTotal = 0;
    let assertionsFail = 0;
    let assertionsSucc = 0;
    for (const a of actions) {
      if (a.state === "SUCCEEDED") succ++;
      else if (a.state === "FAILED") fail++;
      else if (a.state === "RUNNING") running++;
      else if (a.state === "SKIPPED") skipped++;
      if (a.type === "ASSERTION") {
        assertionsTotal++;
        if (a.state === "FAILED") assertionsFail++;
        else if (a.state === "SUCCEEDED") assertionsSucc++;
      }
    }
    invocations.push({
      ...inv,
      actions,
      actionsTotal: actions.length,
      actionsSucceeded: succ,
      actionsFailed: fail,
      actionsRunning: running,
      actionsSkipped: skipped,
      assertionsTotal,
      assertionsSucceeded: assertionsSucc,
      assertionsFailed: assertionsFail,
    });
  }

  invocations.sort((a, b) => new Date(b.startTime!).getTime() - new Date(a.startTime!).getTime());

  // --- WorkflowConfigs + invocation linking ----------------------------------
  const repoBase = `projects/p/locations/l/repositories/${targetKey}`;
  const specs = SCHEDULE_SPECS[targetKey] ?? [];
  const workflowConfigs: WorkflowConfig[] = specs.map((spec) => ({
    name: `${repoBase}/workflowConfigs/${spec.id}`,
    id: spec.id,
    cronSchedule: spec.cronSchedule,
    timeZone: spec.timeZone,
    disabled: spec.disabled === true,
    createTime: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updateTime: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));

  for (const spec of specs) {
    const configRef = `${repoBase}/workflowConfigs/${spec.id}`;
    if (spec.link === "never") continue;

    if (spec.link === "recent") {
      // Link the 3 most recent invocations to this config so the join is non-empty.
      for (let i = 0; i < Math.min(3, invocations.length); i++) {
        invocations[i]!.workflowConfig = configRef;
      }
    } else if (spec.link === "stale") {
      // Link only an old invocation (around the 30th = ~3.5 days ago) so the
      // staleness ratio is comfortably > 2 for daily-cadence schedules.
      const idx = Math.min(invocations.length - 1, 30);
      const target = invocations[idx];
      if (target) target.workflowConfig = configRef;
    }
  }

  // --- Compilation results ---------------------------------------------------
  const compilationSpecs = COMPILATION_SPECS[targetKey] ?? [];
  const compilations: CompilationResult[] = compilationSpecs.map((spec, i) => {
    const id = `c-${targetKey.slice(0, 4)}-${i.toString(16).padStart(3, "0")}`;
    const createTime = new Date(now - spec.hoursAgo * 60 * 60 * 1000).toISOString();
    const target = spec.target?.split(".") ?? [];
    return {
      name: `${repoBase}/compilationResults/${id}`,
      id,
      createTime,
      gitCommitish: "main",
      compilationErrors: spec.failed
        ? [
            {
              message: spec.message ?? "Compilation failed",
              path: spec.path,
              actionTarget: target.length
                ? {
                    database: target[0],
                    schema: target[1],
                    name: target[2],
                    full: spec.target,
                  }
                : undefined,
            },
          ]
        : [],
    };
  });

  // --- Compiled actions (target → tags + type) -----------------------------
  const profile = TAG_PROFILES[targetKey];
  const compiledActions: Array<{ target: string; compiled: CompiledAction }> = [];

  for (const name of RAW_NAMES) {
    compiledActions.push({
      target: `raw.${name}`,
      compiled: { tags: [], type: "DECLARATION" },
    });
  }
  for (const name of STAGING_NAMES) {
    const full = `sta.${name}`;
    compiledActions.push({
      target: full,
      compiled: { tags: profile?.[full] ?? [], type: "TABLE" },
    });
  }
  for (const name of TABLE_NAMES.slice(0, 5)) {
    const full = `analytics.${name}`;
    compiledActions.push({
      target: full,
      compiled: { tags: profile?.[full] ?? [], type: "TABLE" },
    });
  }
  for (const name of ASSERTION_NAMES) {
    compiledActions.push({
      target: `assertions.${name}`,
      compiled: {
        tags: profile ? ["assertions"] : [],
        type: "ASSERTION",
      },
    });
  }

  return { invocations, workflowConfigs, compilations, compiledActions };
}
