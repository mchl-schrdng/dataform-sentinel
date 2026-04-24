import { loadConfigFromDisk, ConfigLoadError } from "./load";
import { mockConfig } from "./mock";
import { logger } from "@/lib/logger";
import type { SentinelConfig, TargetConfig } from "./schema";

export type { SentinelConfig, TargetConfig };
export { ConfigLoadError };

export function isMockMode(): boolean {
  return process.env.SENTINEL_MOCK === "1";
}

let cached: SentinelConfig | null = null;

export function getConfig(): SentinelConfig {
  if (cached) return cached;

  if (isMockMode()) {
    logger.warn("SENTINEL_MOCK=1 — serving fixture config and data");
    cached = mockConfig;
    return cached;
  }

  cached = loadConfigFromDisk();
  return cached;
}

export function getTarget(key: string): TargetConfig | undefined {
  return getConfig().targets.find((t) => t.key === key);
}

export function requireTarget(key: string): TargetConfig {
  const t = getTarget(key);
  if (!t) {
    throw new Error(`Unknown target key: ${key}`);
  }
  return t;
}

/**
 * Resolve the service account used for workflow invocation act-as.
 * Precedence:
 *   1. SENTINEL_SERVICE_ACCOUNT env var (prod via Secret Manager)
 *   2. `service_account` in config.yaml (local dev)
 *   3. undefined → let the Dataform API default / error out clearly
 */
export function getServiceAccount(): string | undefined {
  const fromEnv = process.env.SENTINEL_SERVICE_ACCOUNT?.trim();
  if (fromEnv) return fromEnv;
  const fromFile = getConfig().service_account;
  return fromFile ?? undefined;
}

/** For tests. Not used at runtime. */
export function resetConfigCache(): void {
  cached = null;
}
