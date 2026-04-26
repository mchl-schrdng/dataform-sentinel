"use client";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusDot } from "@/components/shared/status-pill";
import { RelativeTime } from "@/components/shared/relative-time";
import type { InvocationActionMini } from "@/lib/dataform/types";
import type { SkipReason } from "@/lib/dataform/skip-tracer";
import { cn, formatDuration } from "@/lib/utils";

type SortKey = "target" | "type" | "state" | "started" | "duration";

export function ListView({
  actions,
  skipReasons,
  tagsByTarget,
}: {
  actions: InvocationActionMini[];
  skipReasons?: Record<string, SkipReason>;
  tagsByTarget?: Record<string, string[]>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("started");
  const [asc, setAsc] = useState(true);

  const rows = useMemo(() => {
    const copy = [...actions];
    copy.sort((a, b) => {
      const dir = asc ? 1 : -1;
      switch (sortKey) {
        case "target":
          return a.target.full.localeCompare(b.target.full) * dir;
        case "type":
          return a.type.localeCompare(b.type) * dir;
        case "state":
          return a.state.localeCompare(b.state) * dir;
        case "duration":
          return ((a.durationMs ?? 0) - (b.durationMs ?? 0)) * dir;
        case "started":
        default: {
          const ta = a.startTime ? new Date(a.startTime).getTime() : 0;
          const tb = b.startTime ? new Date(b.startTime).getTime() : 0;
          return (ta - tb) * dir;
        }
      }
    });
    return copy;
  }, [actions, asc, sortKey]);

  const toggle = (k: SortKey) => {
    if (sortKey === k) setAsc(!asc);
    else {
      setSortKey(k);
      setAsc(true);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <Sortable label="Action type" k="type" sortKey={sortKey} asc={asc} onClick={toggle} />
            <Sortable label="Target" k="target" sortKey={sortKey} asc={asc} onClick={toggle} />
            <Sortable label="State" k="state" sortKey={sortKey} asc={asc} onClick={toggle} />
            <Sortable label="Started" k="started" sortKey={sortKey} asc={asc} onClick={toggle} />
            <Sortable label="Duration" k="duration" sortKey={sortKey} asc={asc} onClick={toggle} />
            <TableHead>Failure reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a, i) => (
            <TableRow key={`${a.target.full}-${i}`}>
              <TableCell>
                <StatusDot state={a.state} />
              </TableCell>
              <TableCell>
                <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                  {a.type}
                </span>
              </TableCell>
              <TableCell className="font-mono text-[12px]">
                {a.target.full}
                <TagChips tags={tagsByTarget?.[a.target.full]} />
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    "font-mono text-xs",
                    a.state === "FAILED"
                      ? "text-status-failed"
                      : a.state === "RUNNING"
                        ? "text-status-running"
                        : a.state === "SUCCEEDED"
                          ? "text-status-succeeded"
                          : "text-[var(--muted-foreground)]",
                  )}
                >
                  {a.state}
                </span>
              </TableCell>
              <TableCell className="text-[var(--muted-foreground)]">
                <RelativeTime date={a.startTime} />
              </TableCell>
              <TableCell className="font-mono">{formatDuration(a.durationMs)}</TableCell>
              <TableCell className="max-w-[360px] truncate text-[var(--muted-foreground)]">
                <ReasonCell action={a} reason={skipReasons?.[a.target.full]} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TagChips({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex h-4 items-center rounded-sm border border-[var(--border)] bg-[var(--muted)] px-1 text-[10px] font-normal text-[var(--muted-foreground)]"
        >
          {t}
        </span>
      ))}
    </span>
  );
}

function ReasonCell({
  action,
  reason,
}: {
  action: InvocationActionMini;
  reason?: SkipReason;
}) {
  if (action.failureReason) return <span title={action.failureReason}>{action.failureReason}</span>;
  if (action.state !== "SKIPPED" || !reason) return <span>—</span>;
  if (reason.kind === "run_cancelled")
    return <span className="italic">Skipped: run cancelled</span>;
  if (reason.kind === "no_failed_ancestor")
    return <span className="italic">Skipped: upstream conditions not met</span>;
  return (
    <span>
      Blocked by{" "}
      <span className="font-mono text-[12px] text-[var(--foreground)]">
        {reason.blockedBy}
      </span>
      {reason.distance && reason.distance > 1 ? (
        <span className="ml-1 text-[10px] opacity-70">
          ({reason.distance} levels up)
        </span>
      ) : null}
    </span>
  );
}

function Sortable({
  label,
  k,
  sortKey,
  asc,
  onClick,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  asc: boolean;
  onClick: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <TableHead>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-[var(--foreground)]"
        onClick={() => onClick(k)}
      >
        {label}
        {active ? (
          asc ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : null}
      </button>
    </TableHead>
  );
}
