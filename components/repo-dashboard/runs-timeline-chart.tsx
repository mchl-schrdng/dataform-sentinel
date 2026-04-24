"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { TimelineBar } from "@/lib/dataform/aggregations";
import { cn, formatAbsoluteUtc, formatDuration, truncateId } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface RunsTimelineChartProps {
  data: { start: number; end: number; bars: TimelineBar[] };
  targetKey: string;
}

const COLOR: Record<string, string> = {
  SUCCEEDED: "var(--status-succeeded)",
  FAILED: "var(--status-failed)",
  RUNNING: "var(--status-running)",
  CANCELLED: "var(--status-cancelled)",
  CANCELING: "var(--status-cancelled)",
  SKIPPED: "var(--status-skipped)",
  UNKNOWN: "var(--muted-foreground)",
};

const CHART_HEIGHT = 220;
const AXIS_HEIGHT = 28;
const PAD_TOP = 12;

export function RunsTimelineChart({ data, targetKey }: RunsTimelineChartProps) {
  const router = useRouter();

  const { maxDur, ticks } = useMemo(() => {
    const durations = data.bars
      .map((b) => b.durationMs)
      .filter((d): d is number => typeof d === "number" && d > 0);
    const max = durations.length ? Math.max(...durations) : 60_000;
    // Round to nearest 30s for nicer axis
    const rounded = Math.ceil(max / 30_000) * 30_000;
    const step = rounded / 4;
    const t: number[] = [];
    for (let i = 0; i <= 4; i++) t.push(Math.round(step * i));
    return { maxDur: rounded, ticks: t };
  }, [data.bars]);

  const span = data.end - data.start || 1;
  const xTicks = useMemo(() => buildXTicks(data.start, data.end), [data.start, data.end]);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: CHART_HEIGHT + AXIS_HEIGHT + PAD_TOP }}
    >
      {/* Y grid lines */}
      <div className="absolute inset-x-12 top-0" style={{ height: CHART_HEIGHT + PAD_TOP }}>
        {ticks.slice().reverse().map((t, i) => {
          const frac = t / maxDur;
          const top = PAD_TOP + (1 - frac) * CHART_HEIGHT;
          return (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-dashed border-[var(--border)]"
              style={{ top }}
            />
          );
        })}
      </div>
      {/* Y labels */}
      <div className="absolute left-0 top-0 w-12" style={{ height: CHART_HEIGHT + PAD_TOP }}>
        {ticks.slice().reverse().map((t, i) => {
          const frac = t / maxDur;
          const top = PAD_TOP + (1 - frac) * CHART_HEIGHT;
          return (
            <div
              key={i}
              className="absolute -translate-y-1/2 font-mono text-[10px] text-[var(--muted-foreground)]"
              style={{ top }}
            >
              {formatShortDuration(t)}
            </div>
          );
        })}
      </div>

      {/* Bars */}
      <div className="absolute inset-x-12 top-0" style={{ height: CHART_HEIGHT + PAD_TOP }}>
        {data.bars.map((bar) => {
          const leftFrac = (bar.startMs - data.start) / span;
          const dur = bar.durationMs || maxDur * 0.05;
          const heightFrac = Math.min(1, dur / maxDur);
          const barHeight = Math.max(6, heightFrac * CHART_HEIGHT);
          const top = PAD_TOP + CHART_HEIGHT - barHeight;
          const left = `${Math.max(0, Math.min(100, leftFrac * 100)).toFixed(2)}%`;
          return (
            <Tooltip key={bar.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => router.push(`/repos/${targetKey}/invocations/${bar.id}`)}
                  className={cn(
                    "absolute w-[6px] -translate-x-1/2 rounded-sm transition-[outline]",
                    "hover:outline hover:outline-2 hover:outline-[var(--primary)]",
                  )}
                  style={{
                    left,
                    top,
                    height: barHeight,
                    backgroundColor: COLOR[bar.state] ?? "var(--muted-foreground)",
                  }}
                  aria-label={`${bar.state} at ${formatAbsoluteUtc(bar.startMs)}`}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="min-w-[180px]">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: COLOR[bar.state] }}
                  />
                  {bar.state} · {formatAbsoluteUtc(bar.startMs).split(", ")[1]}
                </div>
                <div className="mt-1 font-mono text-[11px] text-[var(--muted-foreground)]">
                  id {truncateId(bar.id, 4, 4)}
                </div>
                <div className="font-mono text-[11px] text-[var(--muted-foreground)]">
                  dur {formatDuration(bar.durationMs)}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* X axis */}
      <div
        className="absolute inset-x-12 border-t border-[var(--border)]"
        style={{ top: PAD_TOP + CHART_HEIGHT }}
      >
        <div className="relative h-7">
          {xTicks.map((t) => {
            const leftFrac = (t.ms - data.start) / span;
            return (
              <div
                key={t.ms}
                className="absolute top-1 -translate-x-1/2 text-[10px] text-[var(--muted-foreground)]"
                style={{ left: `${(leftFrac * 100).toFixed(2)}%` }}
              >
                {t.label}
              </div>
            );
          })}
          <div className="absolute right-0 top-1 text-[10px] text-[var(--muted-foreground)]">
            now
          </div>
        </div>
      </div>
    </div>
  );
}

function buildXTicks(start: number, end: number): Array<{ ms: number; label: string }> {
  const span = end - start;
  const hours = span / 3_600_000;
  const desired = 5;
  const step = span / desired;
  const ticks: Array<{ ms: number; label: string }> = [];
  for (let i = 0; i < desired; i++) {
    const ms = start + step * i;
    ticks.push({ ms, label: formatTickLabel(ms, hours) });
  }
  return ticks;
}

function formatTickLabel(ms: number, totalHours: number): string {
  const d = new Date(ms);
  if (totalHours <= 36) {
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  }
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

function formatShortDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}
