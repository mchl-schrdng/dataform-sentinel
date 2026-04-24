"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SuccessRateBucket } from "@/lib/dataform/aggregations";

export function SuccessRateChart({ data }: { data: SuccessRateBucket[] }) {
  const chartData = data.map((b, i) => ({
    idx: i,
    bucketStart: b.bucketStart,
    rate: Number(b.rate.toFixed(1)),
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="successFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--secondary)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--secondary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="idx"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickFormatter={(v: number) => (v === 0 ? "start" : v === chartData.length - 1 ? "now" : "")}
        />
        <YAxis
          domain={[80, 100]}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickFormatter={(v: number) => `${v}%`}
          width={40}
        />
        <ReferenceLine
          y={95}
          stroke="var(--primary)"
          strokeDasharray="4 4"
          label={{
            value: "SLO 95%",
            position: "right",
            fill: "var(--primary)",
            fontSize: 11,
          }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(v: number) => [`${v}%`, "Success rate"]}
          labelFormatter={() => ""}
        />
        <Area
          type="monotone"
          dataKey="rate"
          stroke="var(--secondary)"
          strokeWidth={2}
          fill="url(#successFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
