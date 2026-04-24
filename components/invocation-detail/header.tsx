import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import type { WorkflowInvocationWithActions } from "@/lib/dataform/types";
import { formatAbsoluteUtc, formatDuration } from "@/lib/utils";

export function InvocationHeaderGrid({ invocation }: { invocation: WorkflowInvocationWithActions }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 lg:grid-cols-5">
      <Field label="Status">
        <StatusPill state={invocation.state} />
      </Field>
      <Field label="Started">
        <span className="font-mono text-sm">{formatAbsoluteUtc(invocation.startTime)}</span>
      </Field>
      <Field label="Duration">
        <span className="font-mono text-sm">
          {invocation.state === "RUNNING" ? "—" : formatDuration(invocation.durationMs)}
        </span>
      </Field>
      <Field label="Trigger">
        <Badge variant="outline" className="font-mono text-[10px]">
          {invocation.trigger}
        </Badge>
      </Field>
      <Field label="Actions">
        <span className="font-mono text-sm">
          {(invocation.actionsSucceeded ?? 0) + (invocation.actionsFailed ?? 0) + (invocation.actionsSkipped ?? 0)}/
          {invocation.actionsTotal ?? 0} completed
        </span>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label-meta">{label}</span>
      {children}
    </div>
  );
}
