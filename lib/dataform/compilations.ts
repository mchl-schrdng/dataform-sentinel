import { unstable_cache } from "next/cache";
import type { TargetConfig } from "@/lib/config";
import { isMockMode } from "@/lib/config";
import { logger } from "@/lib/logger";
import { adaptCompilationResult, adaptCompilationResultAction } from "./adapter";
import { getDataformClient, repositoryName } from "./client";
import { buildFixtureForTarget } from "./fixtures";
import type { CompilationResult, CompiledAction } from "./types";

const CACHE_TTL_SECONDS = 30;
const MAX_PAGES = 4;
const PAGE_SIZE = 50;

/**
 * Fetch the recent compilation results for a repository, filtered to the last
 * `windowDays` days. Live API call, cached at the server for 30s. Mock mode
 * returns deterministic fixtures.
 */
export const listRecentCompilations = async (
  target: TargetConfig,
  windowDays = 7,
): Promise<CompilationResult[]> => {
  return unstable_cache(
    () => listRecentCompilationsLive(target, windowDays),
    [
      "listRecentCompilations",
      target.key,
      String(windowDays),
      process.env.SENTINEL_MOCK ?? "real",
    ],
    { revalidate: CACHE_TTL_SECONDS, tags: [`target:${target.key}`] },
  )();
};

/**
 * Fetch the latest successful compilation and return a map keyed by
 * `target.full` carrying tags and canonical type for every compiled action.
 *
 * Used by the tag-filter feature. Cached for 60s — compilations only change
 * on git push or workspace edits.
 *
 * If the latest compilation in the window failed, returns an empty map and
 * logs a warning. Callers should treat the absence of tags as "no filter
 * available".
 */
export const getLatestCompilationActions = async (
  target: TargetConfig,
): Promise<Record<string, CompiledAction>> => {
  return unstable_cache(
    () => getLatestCompilationActionsLive(target),
    [
      "getLatestCompilationActions",
      target.key,
      process.env.SENTINEL_MOCK ?? "real",
    ],
    { revalidate: 60, tags: [`target:${target.key}`] },
  )();
};

async function getLatestCompilationActionsLive(
  target: TargetConfig,
): Promise<Record<string, CompiledAction>> {
  if (isMockMode()) {
    const fx = buildFixtureForTarget(target.key);
    const out: Record<string, CompiledAction> = {};
    for (const c of fx.compiledActions) out[c.target] = c.compiled;
    return out;
  }

  const client = getDataformClient(target);
  try {
    const [batch] = await client.listCompilationResults({
      parent: repositoryName(target),
      pageSize: 25,
    });
    // The API returns compilation results in unspecified order; sort by
    // createTime descending so we pick the *most recent* successful one
    // rather than whichever happens to come first.
    const sorted = [...(batch ?? [])].sort((a, b) => {
      const ta = (a.createTime as { seconds?: number | string } | string | undefined);
      const tb = (b.createTime as { seconds?: number | string } | string | undefined);
      const tsA = typeof ta === "string"
        ? new Date(ta).getTime()
        : ta && "seconds" in ta
          ? Number(ta.seconds) * 1000
          : 0;
      const tsB = typeof tb === "string"
        ? new Date(tb).getTime()
        : tb && "seconds" in tb
          ? Number(tb.seconds) * 1000
          : 0;
      return tsB - tsA;
    });
    const successful = sorted.find(
      (c) =>
        !(c as { compilationErrors?: unknown[] }).compilationErrors ||
        ((c as { compilationErrors?: unknown[] }).compilationErrors?.length ?? 0) === 0,
    );
    if (!successful?.name) {
      logger.warn(
        { targetKey: target.key },
        "no successful compilation found for tag map",
      );
      return {};
    }
    const out: Record<string, CompiledAction> = {};
    let pageToken: string | undefined;
    do {
      const [actions, , response] = await client.queryCompilationResultActions({
        name: successful.name,
        pageSize: 1000,
        pageToken,
      });
      for (const raw of actions ?? []) {
        const { target: t, compiled } = adaptCompilationResultAction(
          raw as unknown as Record<string, unknown>,
        );
        if (t.full && t.full !== "—") out[t.full] = compiled;
      }
      pageToken = (response as { nextPageToken?: string } | null)?.nextPageToken;
    } while (pageToken);
    return out;
  } catch (err) {
    logger.error({ err, targetKey: target.key }, "getLatestCompilationActions failed");
    return {};
  }
}

async function listRecentCompilationsLive(
  target: TargetConfig,
  windowDays: number,
): Promise<CompilationResult[]> {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;

  if (isMockMode()) {
    const fx = buildFixtureForTarget(target.key);
    return fx.compilations.filter(
      (c) => new Date(c.createTime).getTime() >= cutoff,
    );
  }

  const client = getDataformClient(target);
  const out: CompilationResult[] = [];
  try {
    let pageToken: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const [batch, , response] = await client.listCompilationResults({
        parent: repositoryName(target),
        pageSize: PAGE_SIZE,
        pageToken,
      });
      if (!batch || batch.length === 0) break;
      let crossedCutoff = false;
      for (const raw of batch) {
        const adapted = adaptCompilationResult(raw as unknown as Record<string, unknown>);
        if (new Date(adapted.createTime).getTime() < cutoff) {
          crossedCutoff = true;
          continue;
        }
        out.push(adapted);
      }
      pageToken = (response as { nextPageToken?: string } | null)?.nextPageToken;
      if (!pageToken || crossedCutoff) break;
    }
  } catch (err) {
    logger.error({ err, targetKey: target.key }, "listCompilationResults failed");
    throw err;
  }
  out.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
  return out;
}
