"use client";
import { useState } from "react";
import { Check, Copy, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InvocationActionMini } from "@/lib/dataform/types";
import { cn } from "@/lib/utils";

export function CompiledSqlView({ actions }: { actions: InvocationActionMini[] }) {
  const withSql = actions.filter((a) => a.compiledSql);
  const [selected, setSelected] = useState<InvocationActionMini | null>(withSql[0] ?? null);
  const [copied, setCopied] = useState(false);

  if (withSql.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-xs text-[var(--muted-foreground)]">
        No compiled SQL available for this invocation.
      </div>
    );
  }

  const copy = async () => {
    if (!selected?.compiledSql) return;
    await navigator.clipboard.writeText(selected.compiledSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] lg:grid-cols-[240px_1fr]">
      <aside className="max-h-[520px] overflow-auto border-b border-[var(--border)] lg:border-b-0 lg:border-r">
        {withSql.map((a) => (
          <button
            key={a.target.full}
            type="button"
            onClick={() => setSelected(a)}
            className={cn(
              "flex w-full items-start gap-2 border-b border-[var(--border)]/60 px-3 py-2 text-left text-[12px] hover:bg-[var(--muted)]",
              selected?.target.full === a.target.full && "bg-[var(--muted)]",
            )}
          >
            <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
            <span className="truncate font-mono">{a.target.full}</span>
          </button>
        ))}
      </aside>
      <div className="flex min-h-[320px] flex-col">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
          <span className="font-mono text-xs">{selected?.target.full ?? ""}</span>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={copy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <pre className="flex-1 overflow-auto whitespace-pre bg-[var(--muted)]/40 p-4 font-mono text-[12px] leading-relaxed">
          {selected?.compiledSql ?? ""}
        </pre>
      </div>
    </div>
  );
}
