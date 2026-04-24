"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusDot } from "@/components/shared/status-pill";
import { RelativeTime } from "@/components/shared/relative-time";
import { InvocationRowActions } from "./invocation-row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WorkflowInvocationWithActions } from "@/lib/dataform/types";
import { cn, formatDuration, truncateId } from "@/lib/utils";
import { Search } from "lucide-react";

export interface InvocationsTableProps {
  targetKey: string;
  invocations: WorkflowInvocationWithActions[];
}

export function InvocationsTable({ targetKey, invocations }: InvocationsTableProps) {
  const [query, setQuery] = useState("");
  const [pageSize] = useState(25);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!query) return invocations;
    const q = query.toLowerCase();
    return invocations.filter((i) => i.id.toLowerCase().includes(q));
  }, [invocations, query]);

  const pageStart = page * pageSize;
  const pageEnd = pageStart + pageSize;
  const rows = filtered.slice(pageStart, pageEnd);
  const canPrev = page > 0;
  const canNext = pageEnd < filtered.length;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] p-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--muted-foreground)]" />
            Status <span className="font-mono text-[10px] opacity-60">3</span>
          </Badge>
          <Badge variant="outline">Trigger</Badge>
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            className="h-8 pl-8"
            placeholder="Search invocations…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <span className="ml-auto text-xs text-[var(--muted-foreground)]">
          {filtered.length} invocations
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Invocation ID</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Actions</TableHead>
            <TableHead>Assertions</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((inv) => (
            <TableRow key={inv.id} className="group">
              <TableCell className="pr-0">
                <StatusDot state={inv.state} />
              </TableCell>
              <TableCell>
                <Link
                  href={`/repos/${targetKey}/invocations/${inv.id}`}
                  className="font-mono text-[12px] font-medium hover:underline"
                >
                  {truncateId(inv.id)}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {inv.trigger}
                </Badge>
              </TableCell>
              <TableCell className="text-[var(--muted-foreground)]">
                <RelativeTime date={inv.startTime ?? inv.createTime} />
              </TableCell>
              <TableCell className="font-mono">
                {inv.state === "RUNNING" ? "—" : formatDuration(inv.durationMs)}
              </TableCell>
              <TableCell>
                <ActionRatio
                  done={(inv.actionsSucceeded ?? 0) + (inv.actionsFailed ?? 0) + (inv.actionsSkipped ?? 0)}
                  total={inv.actionsTotal ?? 0}
                  failed={inv.actionsFailed ?? 0}
                />
              </TableCell>
              <TableCell>
                <ActionRatio
                  done={(inv.assertionsSucceeded ?? 0) + (inv.assertionsFailed ?? 0)}
                  total={inv.assertionsTotal ?? 0}
                  failed={inv.assertionsFailed ?? 0}
                />
              </TableCell>
              <TableCell>
                <InvocationRowActions
                  targetKey={targetKey}
                  invocationId={inv.id}
                  state={inv.state}
                  failedCount={inv.actionsFailed ?? 0}
                />
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-6 text-center text-xs text-[var(--muted-foreground)]">
                No invocations match your filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t border-[var(--border)] p-3">
        <span className="text-xs text-[var(--muted-foreground)]">
          Showing {Math.min(rows.length, pageSize)} of {filtered.length}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => setPage(page - 1)}>
            Prev
          </Button>
          <Button variant="outline" size="sm" disabled={!canNext} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActionRatio({ done, total, failed }: { done: number; total: number; failed: number }) {
  if (total === 0) {
    return <span className="text-[var(--muted-foreground)]">—</span>;
  }
  return (
    <span className={cn("font-mono", failed > 0 ? "text-status-failed" : "text-[var(--foreground)]")}>
      {done}/{total}
    </span>
  );
}
