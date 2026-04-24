import Link from "next/link";
import { CheckCircle2, Clock, Database, ShieldCheck } from "lucide-react";
import { Sparkline } from "@/components/shared/sparkline";
import { StatusBars } from "@/components/shared/status-bars";
import { StatusPill } from "@/components/shared/status-pill";
import { RelativeTime } from "@/components/shared/relative-time";
import type { TargetConfig } from "@/lib/config";
import type { RepoCardStats } from "@/lib/dataform/aggregations";
import type { PeriodKey } from "@/lib/dataform/types";
import { formatDuration } from "@/lib/utils";

export interface RepoCardProps {
  target: TargetConfig;
  stats: RepoCardStats;
  period: PeriodKey;
}

export function RepoCard({ target, stats, period }: RepoCardProps) {
  const periodUpper = period.toUpperCase();
  const isRunning = stats.lastState === "RUNNING";
  const durations = stats.recent10Durations.map((d) => (d == null ? null : d));
  return (
    <Link
      href={`/repos/${target.key}`}
      className="group block rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 transition-colors hover:border-[color:var(--ring)]/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[var(--muted-foreground)]" />
            <h3 className="truncate text-base font-semibold">{target.display_name}</h3>
          </div>
          <p className="mt-1 truncate font-mono text-xs text-[var(--muted-foreground)]">
            {target.project_id} · {target.location} · {target.repository}
          </p>
        </div>
        <StatusPill state={stats.lastState} live={isRunning} />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="label-meta">Last 10 runs</span>
          <span className="font-mono text-[11px] text-[var(--muted-foreground)]">dur →</span>
        </div>
        <div className="mt-2">
          <StatusBars statuses={stats.recent10Statuses} />
        </div>
        <div className="mt-1 h-6">
          <Sparkline data={durations} width={260} height={24} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-4 text-xs">
        <Stat
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label={`Success ${periodUpper}`}
          value={`${stats.successRate.toFixed(0)}%`}
        />
        <Stat
          icon={<Clock className="h-3.5 w-3.5" />}
          label={`Avg ${periodUpper}`}
          value={formatDuration(stats.avgDurationMs)}
        />
        <Stat
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          label={`Asserts ${periodUpper}`}
          value={`${stats.assertionsPassRate.toFixed(0)}%`}
        />
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--muted-foreground)]" />
        <span>Last run:</span>
        <RelativeTime date={stats.lastRunTime} />
      </div>
    </Link>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="label-meta flex items-center gap-1.5">
        <span className="text-[var(--muted-foreground)]">{icon}</span>
        {label}
      </span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}
