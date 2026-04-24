import { KpiTile } from "@/components/shared/kpi-tile";
import type { GlobalKpis } from "@/lib/dataform/aggregations";
import type { PeriodKey } from "@/lib/dataform/types";

function direction(n: number): "up" | "down" | "flat" {
  if (n > 0) return "up";
  if (n < 0) return "down";
  return "flat";
}

export function GlobalKpis({ kpis, period }: { kpis: GlobalKpis; period: PeriodKey }) {
  const runsDelta = kpis.runsDelta;
  const rateDelta = kpis.successRateDelta;
  const failedDelta = kpis.failedAssertionsDelta;
  const periodUpper = period.toUpperCase();
  const vsLabel = `vs prev ${period}`;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiTile
        label={`Runs (${periodUpper})`}
        value={kpis.runs24h}
        delta={`${runsDelta >= 0 ? "+" : ""}${runsDelta} ${vsLabel}`}
        deltaDirection={direction(runsDelta)}
      />
      <KpiTile
        label={`Success rate (${periodUpper})`}
        value={`${kpis.successRate24h.toFixed(1)}%`}
        tone={
          kpis.successRate24h >= 95
            ? "positive"
            : kpis.successRate24h >= 80
              ? "warning"
              : "negative"
        }
        delta={`${rateDelta >= 0 ? "+" : ""}${rateDelta.toFixed(1)}% ${vsLabel}`}
        deltaDirection={direction(rateDelta)}
      />
      <KpiTile
        label="Active runs"
        value={kpis.activeRuns}
        tone={kpis.activeRuns > 0 ? "neutral" : "neutral"}
        suffix={
          kpis.activeRuns > 0 ? (
            <span
              className="pulse-dot ml-2 inline-block h-2 w-2 rounded-full bg-status-running text-status-running"
              aria-hidden
            />
          ) : null
        }
        footer={
          kpis.activeRuns > 0 ? (
            <span>{kpis.activeRuns} in progress</span>
          ) : (
            <span>No runs in progress</span>
          )
        }
      />
      <KpiTile
        label={`Failed assertions (${periodUpper})`}
        value={kpis.failedAssertions24h}
        tone={kpis.failedAssertions24h > 0 ? "negative" : "positive"}
        delta={`${failedDelta >= 0 ? "+" : ""}${failedDelta} ${vsLabel}`}
        deltaDirection={direction(failedDelta)}
      />
    </div>
  );
}
