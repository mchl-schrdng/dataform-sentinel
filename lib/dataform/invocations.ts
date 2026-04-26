import { unstable_cache } from "next/cache";
import type { TargetConfig } from "@/lib/config";
import { getServiceAccount, isMockMode } from "@/lib/config";
import { logger } from "@/lib/logger";
import { adaptInvocationAction, adaptWorkflowInvocation, summarizeActions } from "./adapter";
import { getDataformClient, repositoryName } from "./client";
import { buildFixtureForTarget } from "./fixtures";
import type {
  InvocationsPage,
  WorkflowInvocation,
  WorkflowInvocationWithActions,
} from "./types";

const CACHE_TTL_SECONDS = 10;

/**
 * List invocations for a repo, cached at the server for 10s to deduplicate
 * burst requests. Callers that need fresh data should bypass this function
 * and call `listInvocationsLive` directly.
 */
export const listInvocations = async (
  target: TargetConfig,
  pageToken?: string,
  pageSize = 25,
): Promise<InvocationsPage> => {
  return unstable_cache(
    () => listInvocationsLive(target, pageToken, pageSize),
    ["listInvocations", target.key, pageToken ?? "", String(pageSize)],
    { revalidate: CACHE_TTL_SECONDS, tags: [`target:${target.key}`] },
  )();
};

async function listInvocationsLive(
  target: TargetConfig,
  pageToken: string | undefined,
  pageSize: number,
): Promise<InvocationsPage> {
  if (isMockMode()) {
    const fx = buildFixtureForTarget(target.key);
    const start = pageToken ? parseInt(pageToken, 10) : 0;
    const end = start + pageSize;
    const slice = fx.invocations.slice(start, end);
    return {
      invocations: slice,
      nextPageToken: end < fx.invocations.length ? String(end) : undefined,
    };
  }

  const client = getDataformClient(target);
  try {
    const [res] = await client.listWorkflowInvocations({
      parent: repositoryName(target),
      pageSize,
      pageToken,
    });
    return {
      invocations: (res ?? []).map((inv) =>
        adaptWorkflowInvocation(inv as unknown as Record<string, unknown>),
      ),
      // @ts-expect-error — generated client returns an optional pageToken
      nextPageToken: res?.nextPageToken,
    };
  } catch (err) {
    logger.error({ err, targetKey: target.key }, "listWorkflowInvocations failed");
    throw err;
  }
}

/**
 * Fetch all invocations in the last N milliseconds, with their actions populated.
 * Mock mode returns the same view.
 *
 * The Dataform list API only supports orderBy=name, and does not guarantee a
 * chronological order in the general case — so we page up to MAX_PAGES and
 * filter in memory. We only fetch actions for invocations inside the window.
 */
const MAX_LIST_PAGES = 6; // 6 × 100 = up to 600 invocations scanned
const LIST_PAGE_SIZE = 100;

/**
 * List invocations in the last N milliseconds without hydrating actions.
 * Use this when only invocation-level metadata (state, timing, workflowConfig
 * reference) is needed — schedules join, for instance.
 */
export async function listInvocationsInWindow(
  target: TargetConfig,
  windowMs: number,
): Promise<WorkflowInvocation[]> {
  if (isMockMode()) {
    const fx = buildFixtureForTarget(target.key);
    const now = Date.now();
    return fx.invocations.filter((i) => {
      const t = new Date(i.startTime ?? i.createTime).getTime();
      return now - t <= windowMs;
    });
  }

  const client = getDataformClient(target);
  const now = Date.now();
  const out: WorkflowInvocation[] = [];

  let pageToken: string | undefined;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const [batch, , response] = await client.listWorkflowInvocations({
      parent: repositoryName(target),
      pageSize: LIST_PAGE_SIZE,
      pageToken,
    });
    if (!batch || batch.length === 0) break;
    for (const raw of batch) {
      const inv = adaptWorkflowInvocation(raw as unknown as Record<string, unknown>);
      const t = new Date(inv.startTime ?? inv.createTime).getTime();
      if (now - t <= windowMs) out.push(inv);
    }
    pageToken = (response as { nextPageToken?: string } | null)?.nextPageToken;
    if (!pageToken) break;
  }

  out.sort(
    (a, b) =>
      new Date(b.startTime ?? b.createTime).getTime() -
      new Date(a.startTime ?? a.createTime).getTime(),
  );
  return out;
}

export async function listInvocationsWithActionsInWindow(
  target: TargetConfig,
  windowMs: number,
): Promise<WorkflowInvocationWithActions[]> {
  if (isMockMode()) {
    const fx = buildFixtureForTarget(target.key);
    const now = Date.now();
    return fx.invocations.filter((i) => {
      const t = new Date(i.startTime ?? i.createTime).getTime();
      return now - t <= windowMs;
    });
  }

  const client = getDataformClient(target);
  const now = Date.now();
  const inWindow: WorkflowInvocation[] = [];

  let pageToken: string | undefined;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const [batch, , response] = await client.listWorkflowInvocations({
      parent: repositoryName(target),
      pageSize: LIST_PAGE_SIZE,
      pageToken,
    });
    if (!batch || batch.length === 0) break;
    for (const raw of batch) {
      const inv = adaptWorkflowInvocation(raw as unknown as Record<string, unknown>);
      const t = new Date(inv.startTime ?? inv.createTime).getTime();
      if (now - t <= windowMs) inWindow.push(inv);
    }
    pageToken = (response as { nextPageToken?: string } | null)?.nextPageToken;
    if (!pageToken) break;
  }

  // Hydrate actions in parallel with modest concurrency.
  const CONCURRENCY = 8;
  const out: WorkflowInvocationWithActions[] = [];
  for (let i = 0; i < inWindow.length; i += CONCURRENCY) {
    const slice = inWindow.slice(i, i + CONCURRENCY);
    const hydrated = await Promise.all(
      slice.map(async (inv) => {
        const actions = await listActions(target, inv.name);
        return summarizeActions(inv, actions);
      }),
    );
    out.push(...hydrated);
  }

  // Newest first for the UI.
  out.sort(
    (a, b) =>
      new Date(b.startTime ?? b.createTime).getTime() -
      new Date(a.startTime ?? a.createTime).getTime(),
  );
  return out;
}

export async function getInvocation(
  target: TargetConfig,
  invocationId: string,
): Promise<WorkflowInvocationWithActions | undefined> {
  if (isMockMode()) {
    const fx = buildFixtureForTarget(target.key);
    return fx.invocations.find((i) => i.id === invocationId);
  }

  const client = getDataformClient(target);
  const name = `${repositoryName(target)}/workflowInvocations/${invocationId}`;
  const [inv] = await client.getWorkflowInvocation({ name });
  if (!inv) return undefined;
  const base = adaptWorkflowInvocation(inv as unknown as Record<string, unknown>);
  const actions = await listActions(target, name);
  return summarizeActions(base, actions);
}

async function listActions(target: TargetConfig, invocationName: string) {
  const client = getDataformClient(target);
  const [rows] = await client.queryWorkflowInvocationActions({ name: invocationName });
  return (rows ?? []).map((a) => adaptInvocationAction(a as unknown as Record<string, unknown>));
}

export type IncludedTarget =
  | string
  | { database?: string; schema?: string; name?: string };

export async function createInvocation(
  target: TargetConfig,
  opts: {
    compilationResultName?: string;
    includedTargets?: IncludedTarget[];
  } = {},
): Promise<WorkflowInvocation> {
  if (isMockMode()) {
    const now = new Date().toISOString();
    return {
      id: `mock-${Date.now()}`,
      name: `${repositoryName(target)}/workflowInvocations/mock-${Date.now()}`,
      state: "RUNNING",
      trigger: "manual",
      createTime: now,
      startTime: now,
    };
  }

  const client = getDataformClient(target);
  let compilationResult = opts.compilationResultName;
  if (!compilationResult) {
    compilationResult = await resolveCompilationResult(target);
  }

  const serviceAccount = getServiceAccount();
  const defaultDb = target.project_id;

  const [inv] = await client.createWorkflowInvocation({
    parent: repositoryName(target),
    workflowInvocation: {
      compilationResult,
      invocationConfig: {
        includedTargets: opts.includedTargets
          ? opts.includedTargets.map((t) =>
              typeof t === "string" ? parseTargetString(t, defaultDb) : withDefaultDb(t, defaultDb),
            )
          : undefined,
        transitiveDependenciesIncluded: false,
        ...(serviceAccount ? { serviceAccount } : {}),
      },
    },
  });
  return adaptWorkflowInvocation(inv as unknown as Record<string, unknown>);
}

function withDefaultDb(
  t: { database?: string; schema?: string; name?: string },
  defaultDb: string,
) {
  return { database: t.database ?? defaultDb, schema: t.schema, name: t.name };
}

/**
 * Pick a viable compilation source for a repo that didn't ship one.
 * Tries, in order:
 *  1. An existing workspace (prefer "main", else the first one).
 *  2. The repo's default git branch (via git_commitish) if the repo has a
 *     git remote configured.
 *  3. Fails with a human-readable message explaining what to create.
 */
async function resolveCompilationResult(target: TargetConfig): Promise<string | undefined> {
  const client = getDataformClient(target);
  const parent = repositoryName(target);

  const codeCompilationConfig = { defaultDatabase: target.project_id };

  // 1. Try workspaces
  try {
    const [workspaces] = await client.listWorkspaces({ parent, pageSize: 50 });
    if (workspaces && workspaces.length > 0) {
      const main = workspaces.find((w) => (w.name ?? "").endsWith("/main"));
      const picked = main ?? workspaces[0];
      if (picked?.name) {
        const [cr] = await client.createCompilationResult({
          parent,
          compilationResult: { workspace: picked.name, codeCompilationConfig },
        });
        if (cr?.name) return cr.name;
      }
    }
  } catch (err) {
    logger.warn({ err, targetKey: target.key }, "listWorkspaces failed, trying git remote");
  }

  // 2. Try compiling from the git remote's default branch
  try {
    const [repo] = await client.getRepository({ name: parent });
    const defaultBranch =
      (repo as { gitRemoteSettings?: { defaultBranch?: string } } | undefined)?.gitRemoteSettings
        ?.defaultBranch;
    if (defaultBranch) {
      const [cr] = await client.createCompilationResult({
        parent,
        compilationResult: { gitCommitish: defaultBranch, codeCompilationConfig },
      });
      if (cr?.name) return cr.name;
    }
  } catch (err) {
    logger.warn({ err, targetKey: target.key }, "getRepository/gitCommitish compilation failed");
  }

  throw new Error(
    `No way to compile ${target.repository}: the repository has no workspaces and no git remote. ` +
      `Create a workspace named "main" in the Dataform console, or attach a git remote with a default branch.`,
  );
}

function parseTargetString(
  t: string,
  defaultDatabase?: string,
): { database?: string; schema?: string; name?: string } {
  const parts = t.split(".");
  if (parts.length === 3) return { database: parts[0], schema: parts[1], name: parts[2] };
  if (parts.length === 2) return { database: defaultDatabase, schema: parts[0], name: parts[1] };
  return { database: defaultDatabase, name: parts[0] };
}

export async function cancelInvocation(
  target: TargetConfig,
  invocationId: string,
): Promise<void> {
  if (isMockMode()) return;
  const client = getDataformClient(target);
  const name = `${repositoryName(target)}/workflowInvocations/${invocationId}`;
  await client.cancelWorkflowInvocation({ name });
}

export async function rerunInvocation(
  target: TargetConfig,
  invocationId: string,
  opts: { onlyFailed?: boolean } = {},
): Promise<WorkflowInvocation> {
  const previous = await getInvocation(target, invocationId);
  if (!previous) throw new Error(`Invocation not found: ${invocationId}`);

  const includedTargets: IncludedTarget[] | undefined = opts.onlyFailed
    ? previous.actions
        .filter((a) => a.state === "FAILED")
        .map((a) => ({
          database: a.target.database,
          schema: a.target.schema,
          name: a.target.name,
        }))
    : undefined;

  return createInvocation(target, {
    compilationResultName: previous.compilationResultName,
    includedTargets,
  });
}
