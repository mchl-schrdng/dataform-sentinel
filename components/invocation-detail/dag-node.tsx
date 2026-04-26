"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { InvocationActionMini } from "@/lib/dataform/types";
import { cn, formatDuration } from "@/lib/utils";

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 68;

const BORDER: Record<string, string> = {
  SUCCEEDED: "border-[color:var(--status-succeeded)]",
  FAILED: "border-[color:var(--status-failed)]",
  RUNNING: "border-[color:var(--status-running)]",
  SKIPPED: "border-[var(--status-skipped)]",
  CANCELLED: "border-[var(--status-cancelled)]",
  CANCELING: "border-[var(--status-cancelled)]",
  UNKNOWN: "border-[var(--border)]",
};

export function DagNode({ data, selected }: NodeProps) {
  const action = (data as { action: InvocationActionMini }).action;
  const tags = (data as { tags?: string[] }).tags ?? [];
  const { type, state, target, durationMs } = action;
  return (
    <div
      className={cn(
        "rounded-lg border-2 bg-[var(--card)] px-3 py-2",
        BORDER[state],
        selected && "ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--background)]",
      )}
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
    >
      <Handle type="target" position={Position.Left} className="!border-none !bg-[var(--border)]" />
      <div className="label-meta text-[10px]">{type}</div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="truncate font-mono text-[13px] font-semibold">{target.full}</span>
        {durationMs != null && (
          <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
            {formatDuration(durationMs)}
          </span>
        )}
      </div>
      {tags.length > 0 ? (
        <div className="mt-0.5 truncate text-[10px] text-[var(--muted-foreground)]">
          {tags.join(" · ")}
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} className="!border-none !bg-[var(--border)]" />
    </div>
  );
}
