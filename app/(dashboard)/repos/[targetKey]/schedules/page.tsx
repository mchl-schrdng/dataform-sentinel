import { CalendarClock } from "lucide-react";
import { notFound } from "next/navigation";
import { getTarget } from "@/lib/config";
import {
  listInvocationsInWindow,
  listWorkflowConfigs,
} from "@/lib/dataform";
import { computeScheduleStatuses } from "@/lib/dataform/aggregations";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { RefreshButton } from "@/components/shared/refresh-button";
import { SchedulesTable } from "@/components/schedules/schedules-table";

export const dynamic = "force-dynamic";

const JOIN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export default async function RepoSchedulesPage({
  params,
}: {
  params: Promise<{ targetKey: string }>;
}) {
  const { targetKey } = await params;
  const target = getTarget(targetKey);
  if (!target) notFound();

  const [configs, invocations] = await Promise.all([
    listWorkflowConfigs(target),
    listInvocationsInWindow(target, JOIN_WINDOW_MS),
  ]);
  const statuses = computeScheduleStatuses(configs, invocations);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Overview", href: "/" },
          { label: target.display_name, href: `/repos/${target.key}` },
          { label: "Schedules" },
        ]}
      />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight">
            Schedules — {target.display_name}
          </h1>
          <p className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
            {target.project_id} · {target.location} · {target.repository}
          </p>
        </div>
        <RefreshButton />
      </header>

      {configs.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No schedules configured"
          description="This repository has no workflowConfigs. Define them in the Dataform console to monitor cadence here."
        />
      ) : (
        <SchedulesTable targetKey={target.key} statuses={statuses} />
      )}
    </div>
  );
}
