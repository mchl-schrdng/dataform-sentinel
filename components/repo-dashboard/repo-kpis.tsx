import { KpiTile } from "@/components/shared/kpi-tile";
import { Sparkline } from "@/components/shared/sparkline";
import type { RepoKpis as RepoKpisData } from "@/lib/dataform/aggregations";
import { formatDuration } from "@/lib/utils";

function direction(n: number): "up" | "down" | "flat" {
  if (n > 0) return "up";
  if (n < 0) return "down";
  return "flat";
}

export function RepoKpisRow({ data, periodLabel }: { data: RepoKpisData; periodLabel: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiTile
        label="Total invocations"
        value={data.totalInvocations}
        delta={`${data.invocationsDelta >= 0 ? "+" : ""}${data.invocationsDelta} vs prev ${periodLabel}`}
        deltaDirection={direction(data.invocationsDelta)}
      />
      <KpiTile
        label="Success rate"
        value={`${data.successRate.toFixed(1)}%`}
        tone={
          data.successRate >= 95 ? "positive" : data.successRate >= 80 ? "warning" : "negative"
        }
        suffix={<Sparkline data={data.successRateSpark} width={72} height={20} />}
      />
      <KpiTile
        label="Duration"
        value={
          <span className="whitespace-nowrap">
            {formatDuration(data.durationMedianMs)}{" "}
            <span className="text-[var(--muted-foreground)]">/ {formatDuration(data.durationP95Ms)}</span>
          </span>
        }
        footer={<span>median / p95</span>}
      />
      <KpiTile
        label="Assertions pass rate"
        value={`${data.assertionsPassRate.toFixed(1)}%`}
        tone={
          data.assertionsPassRate >= 95
            ? "positive"
            : data.assertionsPassRate >= 80
              ? "warning"
              : "negative"
        }
        delta={`${data.assertionsDelta >= 0 ? "+" : ""}${data.assertionsDelta.toFixed(1)}% vs prev ${periodLabel}`}
        deltaDirection={direction(data.assertionsDelta)}
      />
    </div>
  );
}
