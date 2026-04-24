"use client";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import type { InvocationActionMini } from "@/lib/dataform/types";
import { formatAbsoluteUtc, formatDuration } from "@/lib/utils";

export function ActionSidePanel({
  action,
  onClose,
}: {
  action: InvocationActionMini | null;
  onClose: () => void;
}) {
  const [sqlOpen, setSqlOpen] = useState(false);
  if (!action) return null;

  return (
    <aside className="absolute inset-y-3 right-3 z-20 w-[380px] overflow-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="label-meta flex items-center gap-2">
            <span>{action.type}</span>
            <span>·</span>
            <StatusPill state={action.state} variant="solid" />
          </div>
          <h3 className="mt-2 truncate font-mono text-sm font-semibold">{action.target.full}</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <dl className="mt-4 space-y-2 text-xs">
        <Row k="Type" v={mapType(action.type)} />
        <Row k="Status" v={<StatusPill state={action.state} />} />
        <Row k="Started" v={<span className="font-mono">{formatAbsoluteUtc(action.startTime)}</span>} />
        <Row k="Ended" v={<span className="font-mono">{formatAbsoluteUtc(action.endTime)}</span>} />
        <Row k="Duration" v={<span className="font-mono">{formatDuration(action.durationMs)}</span>} />
        {action.bytesBilled != null && (
          <Row k="Bytes billed" v={<span className="font-mono">{formatBytes(action.bytesBilled)}</span>} />
        )}
      </dl>

      {action.failureReason && (
        <div className="mt-4">
          <div className="label-meta mb-2">Error</div>
          <pre className="max-h-60 overflow-auto rounded-md border border-[color:var(--status-failed)]/30 bg-[color:var(--status-failed)]/5 p-3 font-mono text-[11px] leading-snug text-[var(--foreground)]">
            {action.failureReason}
          </pre>
        </div>
      )}

      {action.compiledSql && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setSqlOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-md border border-[var(--border)] px-3 py-2 text-left text-xs font-medium hover:bg-[var(--muted)]"
          >
            <span className="font-mono">&gt;_ Compiled SQL</span>
            <span className="text-[11px] text-[var(--muted-foreground)]">
              {sqlOpen ? "Hide" : "Show"}
            </span>
          </button>
          {sqlOpen && (
            <pre className="mt-2 max-h-60 overflow-auto rounded-md border border-[var(--border)] bg-[var(--muted)] p-3 font-mono text-[11px] leading-snug">
              {action.compiledSql}
            </pre>
          )}
        </div>
      )}

      <div className="mt-5 flex gap-2 border-t border-[var(--border)] pt-4">
        <Button variant="outline" size="sm" className="flex-1">
          View logs
        </Button>
        <Button size="sm" className="flex-1 gap-1.5">
          Rerun this action
        </Button>
      </div>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[var(--border)]/50 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-[var(--muted-foreground)]">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function mapType(t: string): string {
  switch (t) {
    case "INCREMENTAL_TABLE":
      return "Incremental table";
    case "TABLE":
      return "Table";
    case "VIEW":
      return "View";
    case "ASSERTION":
      return "Assertion";
    case "DECLARATION":
      return "Declaration";
    case "OPERATIONS":
      return "Operations";
    default:
      return t;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
