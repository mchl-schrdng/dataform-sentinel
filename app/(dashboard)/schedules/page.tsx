import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { getConfig, type TargetConfig } from "@/lib/config";
import {
  listInvocationsInWindow,
  listWorkflowConfigs,
} from "@/lib/dataform";
import {
  computeScheduleStatuses,
  countStaleSchedules,
} from "@/lib/dataform/aggregations";
import type { ScheduleStatus } from "@/lib/dataform/types";
import { EmptyState } from "@/components/shared/empty-state";
import { RefreshButton } from "@/components/shared/refresh-button";
import { RelativeTime } from "@/components/shared/relative-time";
import { SchedulesTable } from "@/components/schedules/schedules-table";

export const dynamic = "force-dynamic";

const JOIN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

interface RepoSchedules {
  target: TargetConfig;
  statuses: ScheduleStatus[];
}

const loadSchedules = unstable_cache(
  async (): Promise<RepoSchedules[]> => {
    const config = getConfig();
    const results = await Promise.all(
      config.targets.map(async (target) => {
        const [configs, invocations] = await Promise.all([
          listWorkflowConfigs(target),
          listInvocationsInWindow(target, JOIN_WINDOW_MS),
        ]);
        return {
          target,
          statuses: computeScheduleStatuses(configs, invocations),
        };
      }),
    );
    return results;
  },
  ["schedules-load-v1", process.env.SENTINEL_MOCK ?? "real"],
  { revalidate: 30 },
);

export default async function GlobalSchedulesPage() {
  const repos = await loadSchedules();
  const updatedAt = new Date();
  const withSchedules = repos.filter((r) => r.statuses.length > 0);
  const totalStale = withSchedules.reduce(
    (acc, r) => acc + countStaleSchedules(r.statuses),
    0,
  );
  const totalConfigs = withSchedules.reduce((acc, r) => acc + r.statuses.length, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-meta">Schedules</div>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight">
            {totalConfigs} schedule{totalConfigs === 1 ? "" : "s"}
            {totalStale > 0 && (
              <span className="ml-3 align-middle text-sm font-medium text-[color:var(--status-failed)]">
                {totalStale} stale
              </span>
            )}
          </h1>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Joined to invocations from the last 30 days · updated{" "}
            <RelativeTime date={updatedAt} />
          </p>
        </div>
        <RefreshButton />
      </header>

      {withSchedules.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No schedules configured anywhere"
          description="None of your configured repositories have workflowConfigs. Define them in the Dataform console to monitor cadence here."
        />
      ) : (
        <div className="space-y-8">
          {withSchedules.map(({ target, statuses }) => (
            <section key={target.key} className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">{target.display_name}</h2>
                  <p className="mt-0.5 font-mono text-[11px] text-[var(--muted-foreground)]">
                    {target.project_id} · {target.location} · {target.repository}
                  </p>
                </div>
                <Link
                  href={`/repos/${target.key}/schedules`}
                  className="text-xs font-medium text-[var(--primary)] hover:underline"
                >
                  View per-repo →
                </Link>
              </div>
              <SchedulesTable targetKey={target.key} statuses={statuses} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
