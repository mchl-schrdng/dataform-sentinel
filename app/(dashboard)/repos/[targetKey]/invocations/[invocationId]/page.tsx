import { notFound } from "next/navigation";
import { getTarget } from "@/lib/config";
import { getInvocation, getLatestCompilationActions } from "@/lib/dataform";
import { traceSkippedActions, type SkipReason } from "@/lib/dataform/skip-tracer";
import type { CompiledAction } from "@/lib/dataform/types";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { StatusPill } from "@/components/shared/status-pill";
import { ActionsBar } from "@/components/invocation-detail/actions-bar";
import { InvocationHeaderGrid } from "@/components/invocation-detail/header";
import { InvocationTabs } from "@/components/invocation-detail/tabs";
import { truncateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InvocationDetail({
  params,
}: {
  params: Promise<{ targetKey: string; invocationId: string }>;
}) {
  const { targetKey, invocationId } = await params;
  const target = getTarget(targetKey);
  if (!target) notFound();
  const [inv, compiledByTarget] = await Promise.all([
    getInvocation(target, invocationId),
    getLatestCompilationActions(target),
  ]);
  if (!inv) notFound();

  const failedCount =
    inv.actions.filter((a) => a.state === "FAILED" && a.type !== "ASSERTION").length;

  const skipReasons: Record<string, SkipReason> = Object.fromEntries(
    traceSkippedActions(inv),
  );
  const tagsByTarget: Record<string, string[]> = Object.fromEntries(
    Object.entries(compiledByTarget).map(
      ([k, v]: [string, CompiledAction]) => [k, v.tags],
    ),
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Overview", href: "/" },
          { label: target.display_name, href: `/repos/${target.key}` },
          { label: truncateId(inv.id) },
        ]}
      />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-[22px] font-semibold leading-tight">
              {truncateId(inv.id)}
            </h1>
            <StatusPill state={inv.state} />
          </div>
          <p className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
            {target.repository} · {inv.trigger}
            {inv.commitSha ? ` · commit ${inv.commitSha}` : ""}
          </p>
        </div>
        <ActionsBar
          targetKey={target.key}
          invocationId={inv.id}
          state={inv.state}
          failedCount={failedCount}
        />
      </header>

      <InvocationHeaderGrid invocation={inv} />

      <InvocationTabs
        actions={inv.actions}
        targetKey={target.key}
        invocationId={inv.id}
        skipReasons={skipReasons}
        tagsByTarget={tagsByTarget}
      />
    </div>
  );
}
