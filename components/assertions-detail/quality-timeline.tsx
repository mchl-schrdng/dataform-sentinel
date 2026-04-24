"use client";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { useRouter } from "next/navigation";
import type { QualityTimelinePoint } from "@/lib/dataform/aggregations";
import { formatAbsoluteUtc, truncateId } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { ShieldCheck } from "lucide-react";

export interface QualityTimelineProps {
  points: QualityTimelinePoint[];
  targetKey: string;
}

const SLO_THRESHOLD = 95;

export function QualityTimeline({ points, targetKey }: QualityTimelineProps) {
  const router = useRouter();

  if (points.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No assertion data yet"
        description="As soon as a run with assertions completes, its pass-rate will appear here."
      />
    );
  }

  // Recharts needs numeric x. Use time; format on the axis.
  const data = points.map((p) => ({
    ...p,
    // Recharts expects y as number or null; we use null to break the line
    // while a run was still RUNNING (no total yet is filtered out upstream).
    y: p.passRate,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="qualityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--secondary)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--secondary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="time"
          type="number"
          domain={["dataMin", "dataMax"]}
          scale="time"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickFormatter={(v: number) => {
            const d = new Date(v);
            return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
          }}
          minTickGap={30}
        />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickFormatter={(v: number) => `${v}%`}
          width={40}
        />
        <ReferenceLine
          y={SLO_THRESHOLD}
          stroke="var(--primary)"
          strokeDasharray="4 4"
          label={{
            value: `SLO ${SLO_THRESHOLD}%`,
            position: "right",
            fill: "var(--primary)",
            fontSize: 11,
          }}
        />
        <Tooltip content={<QualityTooltip />} cursor={{ stroke: "var(--border)" }} />
        <Area
          type="monotone"
          dataKey="y"
          stroke="var(--secondary)"
          strokeWidth={1.75}
          fill="url(#qualityFill)"
          isAnimationActive={false}
          activeDot={false}
          dot={false}
        />
        {/* Scatter dot colored per-point by pass/fail, on top of the line. */}
        <Scatter
          dataKey="y"
          data={data}
          shape={(props: { cx?: number; cy?: number; payload?: QualityTimelinePoint }) => {
            const { cx, cy, payload } = props;
            if (cx == null || cy == null || !payload) return <g />;
            const color =
              payload.failed > 0
                ? "var(--status-failed)"
                : payload.passRate >= 99.99
                  ? "var(--status-succeeded)"
                  : "var(--status-running)";
            return (
              <circle
                cx={cx}
                cy={cy}
                r={4}
                fill={color}
                stroke="var(--card)"
                strokeWidth={1.5}
                onClick={() =>
                  router.push(`/repos/${targetKey}/invocations/${payload.invocationId}`)
                }
                style={{ cursor: "pointer" }}
              />
            );
          }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="y"
          stroke="transparent"
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function QualityTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload as QualityTimelinePoint | undefined;
  if (!p) return null;
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{
            background:
              p.failed > 0
                ? "var(--status-failed)"
                : p.passRate >= 99.99
                  ? "var(--status-succeeded)"
                  : "var(--status-running)",
          }}
        />
        <span className="font-mono text-[11px]">{truncateId(p.invocationId)}</span>
      </div>
      <div className="mt-1 font-mono text-[11px] text-[var(--muted-foreground)]">
        {formatAbsoluteUtc(new Date(p.time))}
      </div>
      <div className="mt-1">
        <span className="font-mono">{p.passRate.toFixed(1)}%</span>{" "}
        <span className="text-[var(--muted-foreground)]">
          ({p.succeeded}/{p.total} passed
          {p.failed > 0 ? `, ${p.failed} failed` : ""})
        </span>
      </div>
    </div>
  );
}
