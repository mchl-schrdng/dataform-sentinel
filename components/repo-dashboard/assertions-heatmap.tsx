"use client";
import { useMemo } from "react";
import type { AssertionsHeatmap } from "@/lib/dataform/aggregations";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatAbsoluteUtc } from "@/lib/utils";

const CELL = 14;
const GAP = 2;

export interface AssertionsHeatmapProps {
  data: AssertionsHeatmap;
  /** When true, show all assertions (no row limit). */
  fullHeight?: boolean;
  className?: string;
}

export function AssertionsHeatmapGrid({ data, fullHeight, className }: AssertionsHeatmapProps) {
  const runs = data.runIds;
  const assertions = data.assertions;
  const byPair = useMemo(() => {
    const m = new Map<string, { state: string; error?: string }>();
    for (const c of data.cells) {
      m.set(`${c.assertion}|${c.invocationId}`, { state: c.state, error: c.error });
    }
    return m;
  }, [data.cells]);

  if (runs.length === 0 || assertions.length === 0) {
    return <div className="text-xs text-[var(--muted-foreground)]">No assertion data yet.</div>;
  }

  return (
    <div className={cn("flex gap-3", className)}>
      {/* Left labels */}
      <div
        className="flex flex-col gap-[2px] font-mono text-[11px]"
        style={{ paddingTop: 1 }}
      >
        {assertions.map((name) => (
          <Tooltip key={name}>
            <TooltipTrigger asChild>
              <div
                className="truncate text-[var(--muted-foreground)]"
                style={{ height: CELL, lineHeight: `${CELL}px`, maxWidth: 220 }}
              >
                {name}
              </div>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-[11px]">{name}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Grid */}
      <div
        className={cn("relative", !fullHeight && "overflow-hidden")}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${runs.length}, ${CELL}px)`,
          gap: `${GAP}px`,
          alignContent: "start",
        }}
      >
        {assertions.flatMap((assertion) =>
          runs.map((runId, ri) => {
            const cell = byPair.get(`${assertion}|${runId}`);
            const state = cell?.state ?? "NO_DATA";
            const color = colorFor(state);
            const time = data.runStartTimes[ri];
            return (
              <Tooltip key={`${assertion}|${runId}`}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded-[2px] transition-transform hover:scale-110"
                    style={{ width: CELL, height: CELL, background: color }}
                    aria-label={`${assertion} – ${state}`}
                  />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="font-mono text-[11px]">{assertion}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                    {state === "NO_DATA" ? "No data" : state}
                  </div>
                  <div className="font-mono text-[11px] text-[var(--muted-foreground)]">
                    {time ? formatAbsoluteUtc(time) : "—"}
                  </div>
                  {cell?.error && (
                    <pre className="mt-2 max-h-24 overflow-hidden whitespace-pre-wrap font-mono text-[10px] text-[var(--muted-foreground)]">
                      {cell.error.slice(0, 180)}
                    </pre>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          }),
        )}
      </div>
    </div>
  );
}

function colorFor(state: string): string {
  switch (state) {
    case "SUCCEEDED":
      return "var(--status-succeeded)";
    case "FAILED":
      return "var(--status-failed)";
    case "RUNNING":
      return "var(--status-running)";
    case "NO_DATA":
      return "var(--muted)";
    default:
      return "var(--status-skipped)";
  }
}
