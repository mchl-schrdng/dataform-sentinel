"use client";
import { Play } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/shared/status-pill";
import { Button } from "@/components/ui/button";
import type { InvocationActionMini } from "@/lib/dataform/types";
import { formatDuration } from "@/lib/utils";

export function AssertionsView({
  actions,
  targetKey,
}: {
  actions: InvocationActionMini[];
  targetKey: string;
}) {
  const assertions = actions.filter((a) => a.type === "ASSERTION");
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const [_, start] = useTransition();
  const router = useRouter();

  const rerunOne = (target: string) => {
    setPendingTarget(target);
    start(async () => {
      try {
        await fetch(`/api/targets/${targetKey}/invocations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ includedTargets: [target] }),
        });
        router.refresh();
      } finally {
        setPendingTarget(null);
      }
    });
  };

  if (assertions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-xs text-[var(--muted-foreground)]">
        This invocation has no assertions.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
      {assertions.map((a, i) => (
        <div key={`${a.target.full}-${i}`} className="flex items-start justify-between gap-4 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <StatusPill state={a.state} />
              <span className="font-mono text-[12px] font-medium">{a.target.full}</span>
              {a.durationMs != null && (
                <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                  {formatDuration(a.durationMs)}
                </span>
              )}
            </div>
            {a.failureReason && (
              <pre className="mt-2 max-h-32 overflow-auto rounded-md border border-[color:var(--status-failed)]/30 bg-[color:var(--status-failed)]/5 p-2 font-mono text-[11px]">
                {a.failureReason}
              </pre>
            )}
          </div>
          <Button
            size="sm"
            disabled={pendingTarget === a.target.full}
            onClick={() => rerunOne(a.target.full)}
            className="gap-1.5"
          >
            <Play className="h-3 w-3 fill-current" />
            Rerun
          </Button>
        </div>
      ))}
    </div>
  );
}
