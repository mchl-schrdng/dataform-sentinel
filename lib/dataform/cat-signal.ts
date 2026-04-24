import { unstable_cache } from "next/cache";
import { getConfig } from "@/lib/config";
import { listInvocationsWithActionsInWindow } from "./invocations";

export type CatMood = "sleeping" | "watching" | "worried";

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Derives the sleepy cat's mood from the global pipeline state:
 *   - worried   → any FAILED run or any failed assertion in the last 24h
 *   - watching  → at least one invocation currently RUNNING
 *   - sleeping  → everything calm
 *
 * Errors (config missing, API down, etc.) fall back to `sleeping`. The cat
 * should never surface itself as an error indicator.
 */
export const getCatMood = unstable_cache(
  async (): Promise<CatMood> => {
    try {
      const config = getConfig();
      const snapshots = await Promise.all(
        config.targets.map((t) => listInvocationsWithActionsInWindow(t, WINDOW_MS)),
      );
      const all = snapshots.flat();

      const now = Date.now();
      const cutoff = now - WINDOW_MS;
      const hasRecentFailure = all.some((i) => {
        const t = new Date(i.startTime ?? i.createTime).getTime();
        if (t < cutoff) return false;
        return i.state === "FAILED" || (i.assertionsFailed ?? 0) > 0;
      });
      if (hasRecentFailure) return "worried";

      const hasRunning = all.some((i) => i.state === "RUNNING");
      if (hasRunning) return "watching";

      return "sleeping";
    } catch {
      return "sleeping";
    }
  },
  ["cat-mood", process.env.SENTINEL_MOCK ?? "real"],
  { revalidate: 10 },
);
