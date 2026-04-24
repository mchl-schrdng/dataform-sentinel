import { KpiTile } from "@/components/shared/kpi-tile";
import type { AssertionKpis } from "@/lib/dataform/aggregations";

export function AssertionsKpisRow({ kpis }: { kpis: AssertionKpis }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiTile label="Total assertions" value={kpis.totalAssertions} />
      <KpiTile
        label="Overall pass rate"
        value={`${kpis.overallPassRate.toFixed(1)}%`}
        tone={kpis.overallPassRate >= 95 ? "positive" : kpis.overallPassRate >= 80 ? "warning" : "negative"}
      />
      <KpiTile
        label="Currently failing"
        value={kpis.currentlyFailing}
        tone={kpis.currentlyFailing > 0 ? "negative" : "positive"}
      />
      <KpiTile
        label="Most flaky"
        value={
          kpis.mostFlakyAssertion ? (
            <span className="font-mono text-base">{kpis.mostFlakyAssertion}</span>
          ) : (
            "—"
          )
        }
        footer={
          kpis.mostFlakyAlternations > 0 ? (
            <span>{kpis.mostFlakyAlternations} alternations</span>
          ) : (
            <span>No flapping detected</span>
          )
        }
      />
    </div>
  );
}
