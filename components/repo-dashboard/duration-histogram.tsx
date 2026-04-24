"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistogramBucket } from "@/lib/dataform/aggregations";
import { formatDuration } from "@/lib/utils";

export function DurationHistogram({
  buckets,
  p95Ms,
}: {
  buckets: HistogramBucket[];
  p95Ms: number;
}) {
  const data = buckets.map((b, i) => ({
    idx: i,
    start: b.rangeStartMs,
    end: b.rangeEndMs,
    count: b.count,
  }));
  const p95Bucket = data.findIndex((d) => d.start <= p95Ms && d.end > p95Ms);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="idx"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickFormatter={(v: number) => {
            if (v === 0) return "0s";
            if (v === data.length - 1) return `${formatDuration(data[v]?.end ?? 0)}+`;
            if (v === Math.floor(data.length / 2)) {
              return formatDuration(data[v]?.start ?? 0);
            }
            return "";
          }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          width={30}
        />
        {p95Bucket >= 0 && (
          <ReferenceLine
            x={p95Bucket}
            stroke="var(--primary)"
            strokeDasharray="4 4"
            label={{
              value: `p95 ${formatDuration(p95Ms)}`,
              position: "top",
              fill: "var(--primary)",
              fontSize: 11,
            }}
          />
        )}
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(v: number) => [v, "Runs"]}
          labelFormatter={(_, payload) => {
            const p = payload?.[0]?.payload as { start: number; end: number } | undefined;
            if (!p) return "";
            return `${formatDuration(p.start)} – ${formatDuration(p.end)}`;
          }}
        />
        <Bar dataKey="count" fill="var(--secondary)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
