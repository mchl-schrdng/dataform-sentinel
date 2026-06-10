import { cn } from "@/lib/utils";
import type { InvocationState } from "@/lib/dataform/types";

type PillVariant = "solid" | "dot";

const LABELS: Record<InvocationState, string> = {
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  PENDING: "Pending",
  RUNNING: "Running",
  CANCELLED: "Cancelled",
  CANCELING: "Cancelling",
  DISABLED: "Disabled",
  SKIPPED: "Skipped",
  UNKNOWN: "Unknown",
};

const DOT_CLASS: Record<InvocationState, string> = {
  SUCCEEDED: "bg-status-succeeded",
  FAILED: "bg-status-failed",
  PENDING: "bg-status-running",
  RUNNING: "bg-status-running",
  CANCELLED: "bg-status-cancelled",
  CANCELING: "bg-status-cancelled",
  DISABLED: "bg-status-skipped",
  SKIPPED: "bg-status-skipped",
  UNKNOWN: "bg-[var(--muted-foreground)]",
};

const TEXT_CLASS: Record<InvocationState, string> = {
  SUCCEEDED: "text-status-succeeded",
  FAILED: "text-status-failed",
  PENDING: "text-status-running",
  RUNNING: "text-status-running",
  CANCELLED: "text-status-cancelled",
  CANCELING: "text-status-cancelled",
  DISABLED: "text-status-skipped",
  SKIPPED: "text-status-skipped",
  UNKNOWN: "text-[var(--muted-foreground)]",
};

const BORDER_CLASS: Record<InvocationState, string> = {
  SUCCEEDED: "border-[color:var(--status-succeeded)]/30",
  FAILED: "border-[color:var(--status-failed)]/30",
  PENDING: "border-[color:var(--status-running)]/30",
  RUNNING: "border-[color:var(--status-running)]/30",
  CANCELLED: "border-[var(--border)]",
  CANCELING: "border-[var(--border)]",
  DISABLED: "border-[var(--border)]",
  SKIPPED: "border-[var(--border)]",
  UNKNOWN: "border-[var(--border)]",
};

const BG_TINT_CLASS: Record<InvocationState, string> = {
  SUCCEEDED: "bg-[color:var(--status-succeeded)]/8",
  FAILED: "bg-[color:var(--status-failed)]/8",
  PENDING: "bg-[color:var(--status-running)]/8",
  RUNNING: "bg-[color:var(--status-running)]/8",
  CANCELLED: "bg-[var(--muted)]",
  CANCELING: "bg-[var(--muted)]",
  DISABLED: "bg-[var(--muted)]",
  SKIPPED: "bg-[var(--muted)]",
  UNKNOWN: "bg-[var(--muted)]",
};

export interface StatusPillProps {
  state: InvocationState;
  variant?: PillVariant;
  showLabel?: boolean;
  live?: boolean;
  className?: string;
}

export function StatusPill({
  state,
  variant = "dot",
  showLabel = true,
  live,
  className,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        BORDER_CLASS[state],
        variant === "solid"
          ? `${BG_TINT_CLASS[state]} ${TEXT_CLASS[state]}`
          : `bg-[var(--card)] ${TEXT_CLASS[state]}`,
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full",
          DOT_CLASS[state],
          (state === "RUNNING" || state === "PENDING") && "pulse-dot",
        )}
      />
      {showLabel && LABELS[state]}
      {live && (
        <span className="ml-1 rounded bg-[var(--primary)] px-1.5 py-[1px] text-[10px] font-bold uppercase tracking-wider text-[var(--primary-foreground)]">
          Live
        </span>
      )}
    </span>
  );
}

export function StatusDot({ state, className }: { state: InvocationState; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        DOT_CLASS[state],
        (state === "RUNNING" || state === "PENDING") && "pulse-dot",
        className,
      )}
      aria-label={LABELS[state]}
      role="status"
    />
  );
}
