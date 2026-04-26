import { unstable_cache } from "next/cache";
import { getConfig } from "@/lib/config";
import { computeCompilationHealth } from "./aggregations";
import { listRecentCompilations } from "./compilations";
import { listInvocationsWithActionsInWindow } from "./invocations";

export type CatMood = "sleeping" | "watching" | "worried" | "alert";

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Derives the sleepy cat's mood from the global pipeline state:
 *   - alert     → at least one repo currently has a broken compilation (no
 *                 invocations can run at all — the most concerning state)
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
      const [invocationSnapshots, compilationSnapshots] = await Promise.all([
        Promise.all(
          config.targets.map((t) => listInvocationsWithActionsInWindow(t, WINDOW_MS)),
        ),
        Promise.all(config.targets.map((t) => listRecentCompilations(t, 7))),
      ]);

      const anyBroken = compilationSnapshots.some(
        (comps) => computeCompilationHealth(comps).kind === "currently_broken",
      );
      if (anyBroken) return "alert";

      const all = invocationSnapshots.flat();
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
  ["cat-mood-v2", process.env.SENTINEL_MOCK ?? "real"],
  { revalidate: 10 },
);
