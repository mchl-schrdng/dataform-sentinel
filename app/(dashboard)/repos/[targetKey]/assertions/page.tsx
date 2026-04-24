import { notFound } from "next/navigation";
import { getTarget } from "@/lib/config";
import { listInvocationsWithActionsInWindow } from "@/lib/dataform";
import {
  computeAssertionKpis,
  computeAssertionQualityTimeline,
  computeAssertionsHeatmap,
  computeAssertionsTable,
} from "@/lib/dataform/aggregations";
import { PERIOD_MS, type PeriodKey } from "@/lib/dataform/types";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PeriodSelector } from "@/components/shared/period-selector";
import { RefreshButton } from "@/components/shared/refresh-button";
import { AssertionsKpisRow } from "@/components/assertions-detail/assertions-kpis";
import { AssertionsTable } from "@/components/assertions-detail/assertions-table";
import { QualityTimeline } from "@/components/assertions-detail/quality-timeline";
import { AssertionsHeatmapGrid } from "@/components/repo-dashboard/assertions-heatmap";

export const dynamic = "force-dynamic";
const ALLOWED: PeriodKey[] = ["1h", "24h", "7d", "30d", "90d"];

export default async function AssertionsPage({
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
  const windowMs = Math.max(PERIOD_MS[period], PERIOD_MS["7d"]);
  const invocations = await listInvocationsWithActionsInWindow(target, windowMs);
  const inPeriod = invocations.filter(
    (i) => Date.now() - new Date(i.startTime ?? i.createTime).getTime() <= PERIOD_MS[period],
  );

  const kpis = computeAssertionKpis(inPeriod);
  const timeline = computeAssertionQualityTimeline(inPeriod);
  const heatmap = computeAssertionsHeatmap(inPeriod.slice().reverse(), 100, 30);
  const table = computeAssertionsTable(inPeriod);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Overview", href: "/" },
          { label: target.display_name, href: `/repos/${target.key}` },
          { label: "Assertions" },
        ]}
      />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight">
            Assertions — {target.display_name}
          </h1>
          <p className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
            {target.project_id} · {target.location} · {target.repository}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector value={period} />
          <RefreshButton />
        </div>
      </header>

      <AssertionsKpisRow kpis={kpis} />

      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Data quality over time</h2>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              Assertion pass-rate per run. Click a point to open the invocation.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[var(--muted-foreground)]">
            <LegendDot color="var(--status-succeeded)" label="All passed" />
            <LegendDot color="var(--status-failed)" label="Has failures" />
          </div>
        </div>
        <div className="mt-4">
          <QualityTimeline points={timeline} targetKey={target.key} />
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="text-sm font-semibold">Assertions heatmap</h2>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
          {heatmap.totalAssertions} assertions · last {heatmap.runIds.length} runs
        </p>
        <div className="mt-4 max-h-[460px] overflow-auto">
          <AssertionsHeatmapGrid data={heatmap} fullHeight />
        </div>
      </section>

      <section>
        <AssertionsTable rows={table} targetKey={target.key} />
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
