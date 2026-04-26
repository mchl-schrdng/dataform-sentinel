"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RelativeTime } from "@/components/shared/relative-time";
import type { CompilationResult } from "@/lib/dataform/types";

export interface CompilationsTableProps {
  compilations: CompilationResult[];
}

const STATUS_CLASS = {
  failed: "border-[color:var(--status-failed)]/40 text-[color:var(--status-failed)]",
  ok: "border-[color:var(--status-succeeded)]/40 text-[color:var(--status-succeeded)]",
} as const;

export function CompilationsTable({ compilations }: CompilationsTableProps) {
  const [selected, setSelected] = useState<CompilationResult | null>(null);

  return (
    <>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Errors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {compilations.map((c) => {
              const failed = c.compilationErrors.length > 0;
              return (
                <TableRow
                  key={c.name}
                  className={failed ? "cursor-pointer hover:bg-[var(--muted)]" : ""}
                  onClick={failed ? () => setSelected(c) : undefined}
                >
                  <TableCell className="text-xs text-[var(--muted-foreground)]">
                    <RelativeTime date={c.createTime} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${
                        failed ? STATUS_CLASS.failed : STATUS_CLASS.ok
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          failed ? "bg-[var(--status-failed)]" : "bg-[var(--status-succeeded)]"
                        }`}
                      />
                      {failed ? "Failed" : "Success"}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-[var(--muted-foreground)]">
                    {c.workspace
                      ? `workspace ${shortName(c.workspace)}`
                      : c.gitCommitish
                        ? `git ${c.gitCommitish}`
                        : c.releaseConfig
                          ? `release ${shortName(c.releaseConfig)}`
                          : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)]">
                    {failed ? (
                      <span>
                        <span className="text-[color:var(--status-failed)]">
                          {c.compilationErrors.length} error
                          {c.compilationErrors.length === 1 ? "" : "s"}
                        </span>{" "}
                        — click to view
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {compilations.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-6 text-center text-xs text-[var(--muted-foreground)]"
                >
                  No compilations in window.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compilation errors</DialogTitle>
            {selected ? (
              <DialogDescription>
                {new Date(selected.createTime).toLocaleString()} ·{" "}
                {selected.compilationErrors.length} error
                {selected.compilationErrors.length === 1 ? "" : "s"}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          {selected ? (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
              {selected.compilationErrors.map((e, i) => (
                <div
                  key={i}
                  className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-mono text-[11px] text-[var(--muted-foreground)]">
                      {e.path ?? (e.actionTarget ? "action-scoped" : "Repository-level error")}
                      {e.actionTarget?.full ? ` · ${e.actionTarget.full}` : ""}
                    </div>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[12px] text-[var(--foreground)]">
                    {e.message}
                  </pre>
                  {e.stack ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] text-[var(--muted-foreground)]">
                        stack trace
                      </summary>
                      <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[10px] text-[var(--muted-foreground)]">
                        {e.stack}
                      </pre>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function shortName(resource: string): string {
  const idx = resource.lastIndexOf("/");
  return idx >= 0 ? resource.slice(idx + 1) : resource;
}
