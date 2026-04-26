import { unstable_cache } from "next/cache";
import type { TargetConfig } from "@/lib/config";
import { isMockMode } from "@/lib/config";
import { logger } from "@/lib/logger";
import { adaptWorkflowConfig } from "./adapter";
import { getDataformClient, repositoryName } from "./client";
import { buildFixtureForTarget } from "./fixtures";
import type { WorkflowConfig } from "./types";

const CACHE_TTL_SECONDS = 30;

/**
 * List all `workflowConfigs` (scheduled workflows) for a repository.
 * Cached at the server for 30s — these change rarely (schema/cron edits).
 */
export const listWorkflowConfigs = async (
  target: TargetConfig,
): Promise<WorkflowConfig[]> => {
  return unstable_cache(
    () => listWorkflowConfigsLive(target),
    ["listWorkflowConfigs", target.key, process.env.SENTINEL_MOCK ?? "real"],
    { revalidate: CACHE_TTL_SECONDS, tags: [`target:${target.key}`] },
  )();
};

async function listWorkflowConfigsLive(target: TargetConfig): Promise<WorkflowConfig[]> {
  if (isMockMode()) {
    return buildFixtureForTarget(target.key).workflowConfigs;
  }

  const client = getDataformClient(target);
  try {
    const configs: WorkflowConfig[] = [];
    let pageToken: string | undefined;
    do {
      const [batch, , response] = await client.listWorkflowConfigs({
        parent: repositoryName(target),
        pageSize: 100,
        pageToken,
      });
      for (const raw of batch ?? []) {
        configs.push(adaptWorkflowConfig(raw as unknown as Record<string, unknown>));
      }
      pageToken = (response as { nextPageToken?: string } | null)?.nextPageToken;
    } while (pageToken);
    return configs;
  } catch (err) {
    logger.error({ err, targetKey: target.key }, "listWorkflowConfigs failed");
    throw err;
  }
}
