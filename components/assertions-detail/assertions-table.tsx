"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { AssertionDrawer } from "./assertion-drawer";
import type { AssertionRow } from "@/lib/dataform/aggregations";
import { cn } from "@/lib/utils";

const COLOR_DOT: Record<string, string> = {
  SUCCEEDED: "var(--status-succeeded)",
  FAILED: "var(--status-failed)",
  RUNNING: "var(--status-running)",
};

export function AssertionsTable({ rows, targetKey }: { rows: AssertionRow[]; targetKey: string }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AssertionRow | null>(null);

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => r.target.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center gap-3 border-b border-[var(--border)] p-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              className="h-8 pl-8"
              placeholder="Search assertions…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">{filtered.length} assertions</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assertion</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Pass rate</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead>Last run</TableHead>
              <TableHead>Last failure</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow
                key={row.target}
                className="cursor-pointer"
                onClick={() => setSelected(row)}
              >
                <TableCell className="font-mono text-[12px]">{row.name}</TableCell>
                <TableCell className="font-mono text-[12px] text-[var(--muted-foreground)]">
                  {row.target}
                </TableCell>
                <TableCell
                  className={cn(
                    "font-mono",
                    row.passRate >= 95
                      ? "text-status-succeeded"
                      : row.passRate >= 80
                        ? "text-[color:#B45309]"
                        : "text-status-failed",
                  )}
                >
                  {row.passRate.toFixed(1)}%
                </TableCell>
                <TableCell>
                  <div className="flex gap-[2px]">
                    {row.trend.slice(-20).map((state, i) => (
                      <span
                        key={i}
                        className="h-3 w-1 rounded-sm"
                        style={{ background: COLOR_DOT[state] ?? "var(--muted)" }}
                      />
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusDot state={row.lastState} />
                </TableCell>
                <TableCell className="text-[var(--muted-foreground)]">
                  {row.lastFailure ? <RelativeTime date={row.lastFailure.time} /> : "—"}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-xs text-[var(--muted-foreground)]">
                  No assertions match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AssertionDrawer
        row={selected}
        targetKey={targetKey}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
