import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { getConfig } from "@/lib/config";
import { listInvocationsWithActionsInWindow } from "@/lib/dataform";
import { computeGlobalKpis, computeRepoCardStats } from "@/lib/dataform/aggregations";
import { PERIOD_MS, type PeriodKey } from "@/lib/dataform/types";
import { GlobalKpis } from "@/components/overview/global-kpis";
import { RepoCard } from "@/components/overview/repo-card";
import { KpiRowSkeleton } from "@/components/shared/skeletons/kpi-row-skeleton";
import { CardsGridSkeleton } from "@/components/shared/skeletons/cards-grid-skeleton";
import { PeriodSelector } from "@/components/shared/period-selector";
import { RelativeTime } from "@/components/shared/relative-time";

export const dynamic = "force-dynamic";

const ALLOWED: PeriodKey[] = ["1h", "24h", "7d", "30d", "90d"];
const DEFAULT_PERIOD: PeriodKey = "90d";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const config = getConfig();
  const { period: periodParam } = await searchParams;
  const period: PeriodKey = ALLOWED.includes(periodParam as PeriodKey)
    ? (periodParam as PeriodKey)
    : DEFAULT_PERIOD;

  const updatedAt = new Date();
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-meta">Overview</div>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight">
            Pipelines across {config.targets.length}{" "}
            {config.targets.length === 1 ? "repository" : "repositories"}
          </h1>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Real-time status, last {period} · updated <RelativeTime date={updatedAt} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelector value={period} />
        </div>
      </header>

      <Suspense fallback={<KpiRowSkeleton />}>
        <GlobalKpisSection period={period} />
      </Suspense>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="label-meta">Repositories</h2>
        </div>
        <Suspense fallback={<CardsGridSkeleton count={config.targets.length} />}>
          <RepoCardsGrid period={period} />
        </Suspense>
      </section>

      <footer className="flex items-center justify-between border-t border-[var(--border)] pt-4 text-[11px] text-[var(--muted-foreground)]">
        <span>Showing all {config.targets.length} repositories</span>
        <span className="font-mono">dataform-sentinel v0.1.0</span>
      </footer>
    </div>
  );
}

const loadOverviewFor = unstable_cache(
  async (period: PeriodKey) => {
    const config = getConfig();
    // 2× the selected period gives us both "current" and "previous" buckets for deltas.
    // The per-target fetch is bounded internally (6 pages × 100 invocations).
    const windowMs = PERIOD_MS[period] * 2;
    const results = await Promise.all(
      config.targets.map(async (t) => {
        const invocations = await listInvocationsWithActionsInWindow(t, windowMs);
        return { target: t, invocations };
      }),
    );
    return results;
  },
  // Include mock mode in the cache key so switching SENTINEL_MOCK doesn't
  // serve stale results from the previous mode.
  ["overview-load-v2", process.env.SENTINEL_MOCK ?? "real"],
  { revalidate: 10 },
);

async function GlobalKpisSection({ period }: { period: PeriodKey }) {
  const snapshots = await loadOverviewFor(period);
  const now = Date.now();
  const windowMs = PERIOD_MS[period];
  const all = snapshots.flatMap((s) => s.invocations);
  const inPeriod = all.filter(
    (i) => now - new Date(i.startTime ?? i.createTime).getTime() <= windowMs,
  );
  const prevPeriod = all.filter((i) => {
    const t = new Date(i.startTime ?? i.createTime).getTime();
    return now - t > windowMs && now - t <= windowMs * 2;
  });
  const kpis = computeGlobalKpis(inPeriod, prevPeriod);
  return <GlobalKpis kpis={kpis} period={period} />;
}

async function RepoCardsGrid({ period }: { period: PeriodKey }) {
  const snapshots = await loadOverviewFor(period);
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {snapshots.map(({ target, invocations }) => (
        <RepoCard
          key={target.key}
          target={target}
          stats={computeRepoCardStats(invocations, period)}
          period={period}
        />
      ))}
    </div>
  );
}
