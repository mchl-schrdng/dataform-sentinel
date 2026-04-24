import { readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { configSchema, type SentinelConfig } from "./schema";
import { logger } from "@/lib/logger";

export class ConfigLoadError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ConfigLoadError";
  }
}

function resolveConfigPath(): string {
  if (process.env.SENTINEL_CONFIG_PATH) {
    return path.resolve(process.env.SENTINEL_CONFIG_PATH);
  }
  if (process.env.NODE_ENV === "production") {
    return "/etc/sentinel/config.yaml";
  }
  return path.resolve(process.cwd(), "config.yaml");
}

export function loadConfigFromDisk(): SentinelConfig {
  const configPath = resolveConfigPath();
  let raw: string;
  try {
    raw = readFileSync(configPath, "utf8");
  } catch (err) {
    throw new ConfigLoadError(
      `Failed to read config at ${configPath}. Set SENTINEL_CONFIG_PATH or create the file.`,
      err,
    );
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    throw new ConfigLoadError(`Failed to parse YAML at ${configPath}`, err);
  }

  const result = configSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("\n");
    throw new ConfigLoadError(`Invalid config at ${configPath}:\n${issues}`);
  }

  logger.info(
    { targetsCount: result.data.targets.length, configPath },
    "config loaded successfully",
  );
  return result.data;
}
