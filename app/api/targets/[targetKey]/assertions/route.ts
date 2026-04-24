import { listInvocationsWithActionsInWindow } from "@/lib/dataform";
import {
  computeAssertionKpis,
  computeAssertionsHeatmap,
  computeAssertionsTable,
} from "@/lib/dataform/aggregations";
import { PERIOD_MS, type PeriodKey } from "@/lib/dataform/types";
import { withTarget } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const ALLOWED: PeriodKey[] = ["1h", "24h", "7d", "30d", "90d"];

export async function GET(
  req: Request,
  ctx: { params: Promise<{ targetKey: string }> },
) {
  const { targetKey } = await ctx.params;
  return withTarget(req, { targetKey }, async ({ target }) => {
    const url = new URL(req.url);
    const rawPeriod = url.searchParams.get("period") ?? "90d";
    const period: PeriodKey = ALLOWED.includes(rawPeriod as PeriodKey)
      ? (rawPeriod as PeriodKey)
      : "90d";
    const windowMs = Math.max(PERIOD_MS[period], PERIOD_MS["7d"]);
    const invocations = await listInvocationsWithActionsInWindow(target, windowMs);
    const inPeriod = invocations.filter(
      (i) => Date.now() - new Date(i.startTime ?? i.createTime).getTime() <= PERIOD_MS[period],
    );
    return {
      period,
      kpis: computeAssertionKpis(inPeriod),
      table: computeAssertionsTable(inPeriod),
      heatmap: computeAssertionsHeatmap(inPeriod.slice().reverse(), 100, 30),
    };
  });
}
