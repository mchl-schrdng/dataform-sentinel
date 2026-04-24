import { Badge } from "@/components/ui/badge";
import type { FailingAction } from "@/lib/dataform/aggregations";
import { EmptyState } from "@/components/shared/empty-state";
import { ShieldCheck } from "lucide-react";

export function TopFailingActions({ actions }: { actions: FailingAction[] }) {
  if (actions.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No failing actions"
        description="Every action in this period completed successfully."
      />
    );
  }
  return (
    <ul className="divide-y divide-[var(--border)]">
      {actions.map((a) => (
        <li key={a.target} className="flex items-center justify-between py-2.5">
          <span className="min-w-0 flex-1 truncate font-mono text-xs">{a.target}</span>
          <div className="ml-3 flex shrink-0 items-center gap-2">
            <span className="font-mono text-xs text-[var(--muted-foreground)]">
              {a.failRate.toFixed(0)}%
            </span>
            <Badge className="border border-[color:var(--status-failed)]/30 bg-[color:var(--status-failed)]/10 text-status-failed">
              {a.failedCount} failed
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
