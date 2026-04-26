import { cn } from "@/lib/utils";
import type { ScheduleStatusKind } from "@/lib/dataform/types";

const LABEL: Record<ScheduleStatusKind, string> = {
  ok: "On schedule",
  late: "Late",
  stale: "Stale",
  never: "Never run",
  disabled: "Disabled",
  no_cron: "Manual",
  invalid_cron: "Invalid cron",
};

const TONE: Record<ScheduleStatusKind, { dot: string; text: string; border: string }> = {
  ok: {
    dot: "bg-[var(--status-succeeded)]",
    text: "text-[color:var(--status-succeeded)]",
    border: "border-[color:var(--status-succeeded)]/40",
  },
  late: {
    dot: "bg-[#B45309]",
    text: "text-[color:#B45309]",
    border: "border-[color:#B45309]/40",
  },
  stale: {
    dot: "bg-[var(--status-failed)]",
    text: "text-[color:var(--status-failed)]",
    border: "border-[color:var(--status-failed)]/40",
  },
  never: {
    dot: "bg-[var(--muted-foreground)]",
    text: "text-[var(--muted-foreground)]",
    border: "border-[var(--border)]",
  },
  disabled: {
    dot: "bg-[var(--muted-foreground)]",
    text: "text-[var(--muted-foreground)]",
    border: "border-[var(--border)]",
  },
  no_cron: {
    dot: "bg-[var(--muted-foreground)]",
    text: "text-[var(--muted-foreground)]",
    border: "border-[var(--border)]",
  },
  invalid_cron: {
    dot: "bg-[var(--status-failed)]",
    text: "text-[color:var(--status-failed)]",
    border: "border-[color:var(--status-failed)]/40",
  },
};

export interface ScheduleStatusPillProps {
  kind: ScheduleStatusKind;
  className?: string;
}

export function ScheduleStatusPill({ kind, className }: ScheduleStatusPillProps) {
  const tone = TONE[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border bg-transparent px-2 py-0.5 text-xs font-medium",
        tone.border,
        tone.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} aria-hidden />
      {LABEL[kind]}
    </span>
  );
}
