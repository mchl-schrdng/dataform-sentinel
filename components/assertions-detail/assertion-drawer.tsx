"use client";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AssertionRow } from "@/lib/dataform/aggregations";
import { formatAbsoluteUtc } from "@/lib/utils";

const COLOR_DOT: Record<string, string> = {
  SUCCEEDED: "var(--status-succeeded)",
  FAILED: "var(--status-failed)",
  RUNNING: "var(--status-running)",
};

export function AssertionDrawer({
  row,
  targetKey,
  onClose,
}: {
  row: AssertionRow | null;
  targetKey: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(row)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        {row && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-mono text-sm font-semibold">{row.name}</h2>
                <p className="mt-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                  {row.target}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <div className="label-meta mb-2">Last {Math.min(row.trend.length, 50)} executions</div>
              <div className="flex flex-wrap gap-[3px]">
                {row.trend.slice(-50).map((state, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-block h-4 w-4 rounded-[2px]"
                        style={{ background: COLOR_DOT[state] ?? "var(--muted)" }}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="font-mono text-[11px]">{state}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="label-meta">Pass rate</div>
                <div className="mt-0.5 font-mono text-base">{row.passRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="label-meta">Total executions</div>
                <div className="mt-0.5 font-mono text-base">{row.totalExecutions}</div>
              </div>
              <div>
                <div className="label-meta">First seen</div>
                <div className="mt-0.5 font-mono text-[12px]">{formatAbsoluteUtc(row.firstSeen)}</div>
              </div>
              <div>
                <div className="label-meta">Last seen</div>
                <div className="mt-0.5 font-mono text-[12px]">{formatAbsoluteUtc(row.lastSeen)}</div>
              </div>
            </div>

            {row.lastFailure && (
              <div>
                <div className="label-meta mb-2">Last failure</div>
                <div className="rounded-md border border-[color:var(--status-failed)]/30 bg-[color:var(--status-failed)]/5 p-3">
                  <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
                    <span className="font-mono">{row.lastFailure.invocationId}</span>
                    <span>{formatAbsoluteUtc(row.lastFailure.time)}</span>
                  </div>
                  {row.lastFailure.error && (
                    <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-[var(--foreground)]">
                      {row.lastFailure.error}
                    </pre>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
              <Button size="sm">Rerun this assertion</Button>
              {row.lastFailure && (
                <Link
                  href={`/repos/${targetKey}/invocations/${row.lastFailure.invocationId}`}
                  className="text-xs font-medium text-[var(--primary)] hover:underline"
                >
                  View in invocation →
                </Link>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
