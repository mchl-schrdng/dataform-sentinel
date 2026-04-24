import type { ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTone = "neutral" | "positive" | "negative" | "warning";

export interface KpiTileProps {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaDirection?: "up" | "down" | "flat";
  tone?: KpiTone;
  suffix?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const TONE_CLASS: Record<KpiTone, string> = {
  neutral: "text-[var(--foreground)]",
  positive: "text-status-succeeded",
  negative: "text-status-failed",
  warning: "text-[color:#B45309]",
};

const DELTA_TONE: Record<"up" | "down" | "flat", string> = {
  up: "text-status-succeeded",
  down: "text-status-failed",
  flat: "text-[var(--muted-foreground)]",
};

export function KpiTile({
  label,
  value,
  delta,
  deltaDirection,
  tone = "neutral",
  suffix,
  footer,
  className,
}: KpiTileProps) {
  return (
    <div
      className={cn(
        "flex min-h-[104px] flex-col justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-4",
        className,
      )}
    >
      <div className="label-meta">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={cn("font-mono text-2xl leading-none", TONE_CLASS[tone])}>{value}</span>
        {suffix}
      </div>
      {(delta || footer) && (
        <div className="mt-2 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
          {delta && deltaDirection && (
            <span className={cn("inline-flex items-center gap-0.5", DELTA_TONE[deltaDirection])}>
              {deltaDirection === "up" ? (
                <ArrowUp className="h-3 w-3" />
              ) : deltaDirection === "down" ? (
                <ArrowDown className="h-3 w-3" />
              ) : null}
              {delta}
            </span>
          )}
          {footer}
        </div>
      )}
    </div>
  );
}
