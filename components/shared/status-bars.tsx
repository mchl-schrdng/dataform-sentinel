import { cn } from "@/lib/utils";
import type { InvocationState } from "@/lib/dataform/types";

const BAR_CLASS: Record<InvocationState, string> = {
  SUCCEEDED: "bg-status-succeeded",
  FAILED: "bg-status-failed",
  RUNNING: "bg-status-running",
  CANCELLED: "bg-status-cancelled",
  CANCELING: "bg-status-cancelled",
  SKIPPED: "bg-status-skipped",
  UNKNOWN: "bg-[var(--muted)]",
};

export interface StatusBarsProps {
  /** Chronological order (oldest first). */
  statuses: InvocationState[];
  className?: string;
}

/** GitHub-Actions style horizontal row of small status bars. */
export function StatusBars({ statuses, className }: StatusBarsProps) {
  return (
    <div
      className={cn("grid gap-1", className)}
      style={{ gridTemplateColumns: `repeat(${statuses.length}, minmax(0, 1fr))` }}
    >
      {statuses.map((s, i) => (
        <span
          key={i}
          className={cn("h-8 rounded-sm", BAR_CLASS[s])}
          aria-label={s}
          title={s}
        />
      ))}
    </div>
  );
}
