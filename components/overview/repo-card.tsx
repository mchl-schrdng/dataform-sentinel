import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Database, ShieldCheck } from "lucide-react";
import { Sparkline } from "@/components/shared/sparkline";
import { StatusBars } from "@/components/shared/status-bars";
import { StatusPill } from "@/components/shared/status-pill";
import { RelativeTime } from "@/components/shared/relative-time";
import type { TargetConfig } from "@/lib/config";
import type { RepoCardStats } from "@/lib/dataform/aggregations";
import type { CompilationHealth, PeriodKey } from "@/lib/dataform/types";
import { formatDuration } from "@/lib/utils";

export interface RepoCardProps {
  target: TargetConfig;
  stats: RepoCardStats;
  period: PeriodKey;
  staleScheduleCount?: number;
  scheduleCount?: number;
  compilationHealth?: CompilationHealth;
}

export function RepoCard({
  target,
  stats,
  period,
  staleScheduleCount = 0,
  scheduleCount = 0,
  compilationHealth,
}: RepoCardProps) {
  const periodUpper = period.toUpperCase();
  const isRunning = stats.lastState === "RUNNING";
  const durations = stats.recent10Durations.map((d) => (d == null ? null : d));
  return (
    <div className="group relative rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 transition-colors hover:border-[color:var(--ring)]/40">
      {/* Stretched link covers the whole card; nested links sit above it via z-index. */}
      <Link
        href={`/repos/${target.key}`}
        aria-label={target.display_name}
        className="absolute inset-0 z-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ring)]"
      />
      <div className="relative z-10 pointer-events-none flex items-start justify-between gap-3">
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

      {compilationHealth?.kind === "currently_broken" ? (
        <CompilationBanner
          targetKey={target.key}
          tone="failed"
          headline="Compilation broken"
          subline={
            compilationHealth.lastSuccessfulAt
              ? "no new invocations until fixed"
              : "no successful compilation in window"
          }
        />
      ) : compilationHealth?.kind === "recently_broken" ? (
        <CompilationBanner
          targetKey={target.key}
          tone="warning"
          headline={`${compilationHealth.failureCountInWindow} compilation failure${
            compilationHealth.failureCountInWindow === 1 ? "" : "s"
          } in last 7d`}
          subline="now resolved"
        />
      ) : null}

      <div className="relative z-10 pointer-events-none mt-5">
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

      <div className="relative z-10 pointer-events-none mt-4 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-4 text-xs">
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

      <div className="relative z-10 pointer-events-none mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
        <span className="pointer-events-none flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--muted-foreground)]" />
          <span>Last run:</span>
          <RelativeTime date={stats.lastRunTime} />
        </span>
        {staleScheduleCount > 0 ? (
          <ScheduleBadge
            targetKey={target.key}
            count={staleScheduleCount}
            label="stale"
            tone="failed"
          />
        ) : scheduleCount > 0 ? (
          <ScheduleBadge
            targetKey={target.key}
            count={scheduleCount}
            label={scheduleCount === 1 ? "schedule" : "schedules"}
            tone="muted"
          />
        ) : null}
      </div>
    </div>
  );
}

function CompilationBanner({
  targetKey,
  tone,
  headline,
  subline,
}: {
  targetKey: string;
  tone: "failed" | "warning";
  headline: string;
  subline: string;
}) {
  const cls =
    tone === "failed"
      ? "border-[color:var(--status-failed)]/40 bg-[color:var(--status-failed)]/5 text-[color:var(--status-failed)]"
      : "border-[color:#B45309]/40 bg-[color:#B45309]/5 text-[color:#B45309]";
  return (
    <Link
      href={`/repos/${targetKey}/compilations`}
      className={`relative z-10 mt-4 flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${cls}`}
    >
      <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" aria-hidden />
      <span className="flex-1">
        <span className="font-medium">{headline}</span>
        <span className="ml-1 opacity-80">— {subline}</span>
      </span>
    </Link>
  );
}

function ScheduleBadge({
  targetKey,
  count,
  label,
  tone,
}: {
  targetKey: string;
  count: number;
  label: string;
  tone: "failed" | "muted";
}) {
  const toneClass =
    tone === "failed"
      ? "border-[color:var(--status-failed)]/40 text-[color:var(--status-failed)]"
      : "border-[var(--border)] text-[var(--muted-foreground)]";
  return (
    <Link
      href={`/repos/${targetKey}/schedules`}
      className={`pointer-events-auto ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors hover:bg-[var(--muted)] ${toneClass}`}
    >
      {tone === "failed" ? <AlertTriangle className="h-3 w-3" aria-hidden /> : null}
      {count} {label}
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
