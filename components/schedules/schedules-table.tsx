import Link from "next/link";
import cronstrue from "cronstrue";
import { ScheduleStatusPill } from "./schedule-status-pill";
import { RelativeTime } from "@/components/shared/relative-time";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScheduleStatus } from "@/lib/dataform/types";

export interface SchedulesTableProps {
  /** When provided, the workflow id cell links to the per-repo invocations
   * page filtered to this target. Omit for the global view. */
  targetKey?: string;
  statuses: ScheduleStatus[];
}

function humanizeCron(cron: string | undefined): string {
  if (!cron) return "—";
  try {
    return cronstrue.toString(cron);
  } catch {
    return cron;
  }
}

const STATUS_RANK: Record<string, number> = {
  stale: 0,
  late: 1,
  invalid_cron: 2,
  never: 3,
  ok: 4,
  no_cron: 5,
  disabled: 6,
};

export function SchedulesTable({ targetKey, statuses }: SchedulesTableProps) {
  const sorted = [...statuses].sort(
    (a, b) =>
      (STATUS_RANK[a.statusKind] ?? 99) - (STATUS_RANK[b.statusKind] ?? 99) ||
      a.config.id.localeCompare(b.config.id),
  );

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Workflow</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead>Next expected</TableHead>
            <TableHead>Last run</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(({ config, lastInvocation, nextExpectedAt, statusKind }) => (
            <TableRow key={config.name}>
              <TableCell className="font-mono text-[12px]">
                {targetKey && lastInvocation ? (
                  <Link
                    href={`/repos/${targetKey}/invocations/${lastInvocation.id}`}
                    className="font-medium hover:underline"
                  >
                    {config.id}
                  </Link>
                ) : (
                  <span className="font-medium">{config.id}</span>
                )}
                {config.timeZone ? (
                  <span className="ml-2 text-[10px] text-[var(--muted-foreground)]">
                    {config.timeZone}
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="text-xs text-[var(--muted-foreground)]">
                {humanizeCron(config.cronSchedule)}
              </TableCell>
              <TableCell className="text-xs text-[var(--muted-foreground)]">
                {statusKind === "disabled" || !nextExpectedAt ? (
                  "—"
                ) : (
                  <RelativeTime date={nextExpectedAt} />
                )}
              </TableCell>
              <TableCell className="text-xs text-[var(--muted-foreground)]">
                {lastInvocation ? (
                  <RelativeTime
                    date={lastInvocation.startTime ?? lastInvocation.createTime}
                  />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-right">
                <ScheduleStatusPill kind={statusKind} />
              </TableCell>
            </TableRow>
          ))}
          {sorted.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-6 text-center text-xs text-[var(--muted-foreground)]"
              >
                No schedules.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
