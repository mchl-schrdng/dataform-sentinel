import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getConfig, getTarget } from "@/lib/config";
import { listInvocationsWithActionsInWindow } from "@/lib/dataform";
import {
  computeAssertionsHeatmap,
  computeDurationHistogram,
  computeRepoKpis,
  computeRunsTimeline,
  computeSuccessRateSeries,
  computeTopFailingActions,
} from "@/lib/dataform/aggregations";
import { PERIOD_MS, type PeriodKey } from "@/lib/dataform/types";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { StatusPill } from "@/components/shared/status-pill";
import { PeriodSelector } from "@/components/shared/period-selector";
import { RefreshButton } from "@/components/shared/refresh-button";
import { RepoKpisRow } from "@/components/repo-dashboard/repo-kpis";
import { RunsTimelineChart } from "@/components/repo-dashboard/runs-timeline-chart";
import { SuccessRateChart } from "@/components/repo-dashboard/success-rate-chart";
import { DurationHistogram } from "@/components/repo-dashboard/duration-histogram";
import { TopFailingActions } from "@/components/repo-dashboard/top-failing-actions";
import { AssertionsHeatmapGrid } from "@/components/repo-dashboard/assertions-heatmap";
import { InvocationsTable } from "@/components/repo-dashboard/invocations-table";
import { RunWorkflowButton } from "@/components/repo-dashboard/run-workflow-button";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ALLOWED: PeriodKey[] = ["1h", "24h", "7d", "30d", "90d"];

export async function generateStaticParams() {
  return getConfig().targets.map((t) => ({ targetKey: t.key }));
}

export default async function RepoDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ targetKey: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { targetKey } = await params;
  const { period: periodParam } = await searchParams;
  const target = getTarget(targetKey);
  if (!target) notFound();

  const period: PeriodKey = ALLOWED.includes(periodParam as PeriodKey)
    ? (periodParam as PeriodKey)
    : "90d";

  const windowMs = Math.max(PERIOD_MS[period] * 2, PERIOD_MS["7d"]);
  const invocations = await listInvocationsWithActionsInWindow(target, windowMs);
  const now = Date.now();
  const inPeriod = invocations.filter(
    (i) => now - new Date(i.startTime ?? i.createTime).getTime() <= PERIOD_MS[period],
  );

  const kpis = computeRepoKpis(invocations, period, now);
  const timeline = computeRunsTimeline(inPeriod, period, now);
  const successSeries = computeSuccessRateSeries(invocations, period);
  const histogram = computeDurationHistogram(inPeriod);
  const failing = computeTopFailingActions(inPeriod, 5);
  const heatmap = computeAssertionsHeatmap(inPeriod.slice().reverse(), 20, 30);
  const latestState = invocations[0]?.state ?? "UNKNOWN";

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Overview", href: "/" },
          { label: target.display_name },
        ]}
      />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-semibold leading-tight">{target.display_name}</h1>
            <StatusPill state={latestState} live={latestState === "RUNNING"} />
          </div>
          <p className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
            {target.project_id} · {target.location} · {target.repository}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector value={period} />
          <RefreshButton />
          <RunWorkflowButton targetKey={target.key} displayName={target.display_name} />
        </div>
      </header>

      <div className="label-meta">{target.key} · {period}</div>

      <RepoKpisRow data={kpis} periodLabel={period} />

      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Runs timeline</h2>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              Each bar is an invocation, height = duration
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[var(--muted-foreground)]">
            <LegendDot color="var(--status-succeeded)" label="Succeeded" />
            <LegendDot color="var(--status-failed)" label="Failed" />
            <LegendDot color="var(--status-running)" label="Running" />
          </div>
        </div>
        <div className="mt-4">
          <RunsTimelineChart data={timeline} targetKey={target.key} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-sm font-semibold">Success rate</h2>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Trend vs 95% SLO</p>
          <div className="mt-2">
            <SuccessRateChart data={successSeries} />
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-sm font-semibold">Duration distribution</h2>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            p50 {formatDuration(histogram.p50Ms)} · p95 {formatDuration(histogram.p95Ms)}
          </p>
          <div className="mt-2">
            <DurationHistogram buckets={histogram.buckets} p95Ms={histogram.p95Ms} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-sm font-semibold">Top failing actions</h2>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Last {period} runs</p>
          <div className="mt-3">
            <TopFailingActions actions={failing} />
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Assertions health</h2>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {Math.min(heatmap.assertions.length, 20)} of {heatmap.totalAssertions} assertions ·
                last {heatmap.runIds.length} runs
              </p>
            </div>
            <Link
              href={`/repos/${target.key}/assertions`}
              className="flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline"
            >
              View all assertions <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <AssertionsHeatmapGrid data={heatmap} />
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
            <span>{heatmap.runIds.length} runs ago</span>
            <span>latest →</span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold">Invocations</h2>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Most recent first</p>
          </div>
        </div>
        <InvocationsTable targetKey={target.key} invocations={invocations} />
      </section>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
