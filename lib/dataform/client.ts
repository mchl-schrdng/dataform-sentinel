import { DataformClient } from "@google-cloud/dataform";
import type { TargetConfig } from "@/lib/config";
import { logger } from "@/lib/logger";

let singleton: DataformClient | null = null;

export function getDataformClient(_target: TargetConfig): DataformClient {
  if (!singleton) {
    singleton = new DataformClient({
      // ADC is used by default. No explicit credentials here.
      fallback: false,
    });
    logger.debug("initialized Dataform client");
  }
  return singleton;
}

export function repositoryName(t: TargetConfig): string {
  return `projects/${t.project_id}/locations/${t.location}/repositories/${t.repository}`;
}
