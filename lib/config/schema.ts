import { z } from "zod";

const keyPattern = /^[a-z0-9-]+$/;

export const targetSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(keyPattern, "key must match ^[a-z0-9-]+$ (lowercase, digits, hyphens only)"),
  display_name: z.string().min(1),
  project_id: z.string().min(1),
  location: z.string().min(1),
  repository: z.string().min(1),
});

export const configSchema = z
  .object({
    refresh_interval_seconds: z.number().int().min(5).max(300).default(30),
    /**
     * Optional. Service account email that Dataform workflow invocations run
     * as. Required when the GCP project enforces strict IAM act-as checks.
     * Can also be set via the SENTINEL_SERVICE_ACCOUNT env var (which takes
     * precedence — the recommended path for prod via Secret Manager).
     */
    service_account: z.string().email().optional(),
    targets: z.array(targetSchema).min(1, "at least one target is required"),
  })
  .superRefine((cfg, ctx) => {
    const seen = new Set<string>();
    for (const [index, t] of cfg.targets.entries()) {
      if (seen.has(t.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["targets", index, "key"],
          message: `duplicate target key: ${t.key}`,
        });
      }
      seen.add(t.key);
    }
  });

export type TargetConfig = z.infer<typeof targetSchema>;
export type SentinelConfig = z.infer<typeof configSchema>;
