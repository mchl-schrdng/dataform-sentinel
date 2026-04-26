import { FileWarning } from "lucide-react";
import { notFound } from "next/navigation";
import { getTarget } from "@/lib/config";
import { listRecentCompilations } from "@/lib/dataform";
import { computeCompilationHealth } from "@/lib/dataform/aggregations";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { RefreshButton } from "@/components/shared/refresh-button";
import { RelativeTime } from "@/components/shared/relative-time";
import { CompilationsTable } from "@/components/compilations/compilations-table";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 7;

export default async function RepoCompilationsPage({
  params,
}: {
  params: Promise<{ targetKey: string }>;
}) {
  const { targetKey } = await params;
  const target = getTarget(targetKey);
  if (!target) notFound();

  const compilations = await listRecentCompilations(target, WINDOW_DAYS);
  const health = computeCompilationHealth(compilations);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Overview", href: "/" },
          { label: target.display_name, href: `/repos/${target.key}` },
          { label: "Compilations" },
        ]}
      />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight">
            Compilations — {target.display_name}
          </h1>
          <p className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
            {target.project_id} · {target.location} · {target.repository}
          </p>
        </div>
        <RefreshButton />
      </header>

      {health.kind === "currently_broken" ? (
        <div className="rounded-md border border-[color:var(--status-failed)]/40 bg-[color:var(--status-failed)]/5 p-4 text-sm">
          <div className="font-semibold text-[color:var(--status-failed)]">
            Compilation broken
          </div>
          <div className="mt-1 text-[var(--muted-foreground)]">
            Last successful compilation:{" "}
            {health.lastSuccessfulAt ? (
              <RelativeTime date={health.lastSuccessfulAt} />
            ) : (
              "never"
            )}
            . While compilation is broken, no new workflow invocations can be created.
          </div>
        </div>
      ) : health.kind === "recently_broken" ? (
        <div className="rounded-md border border-[color:#B45309]/40 bg-[color:#B45309]/5 p-4 text-sm">
          <div className="font-semibold text-[color:#B45309]">
            Recently broken — now resolved
          </div>
          <div className="mt-1 text-[var(--muted-foreground)]">
            {health.failureCountInWindow} compilation failure
            {health.failureCountInWindow === 1 ? "" : "s"} in the last {WINDOW_DAYS} days, latest
            succeeded.
          </div>
        </div>
      ) : null}

      {compilations.length === 0 ? (
        <EmptyState
          icon={FileWarning}
          title="No compilations in window"
          description={`This repository has no compilation results in the last ${WINDOW_DAYS} days.`}
        />
      ) : (
        <CompilationsTable compilations={compilations} />
      )}
    </div>
  );
}
