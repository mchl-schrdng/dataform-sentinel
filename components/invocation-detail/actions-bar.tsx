"use client";
import { Play, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { InvocationState } from "@/lib/dataform/types";

export function ActionsBar({
  targetKey,
  invocationId,
  state,
  failedCount,
}: {
  targetKey: string;
  invocationId: string;
  state: InvocationState;
  failedCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (url: string, method: string) => {
    setError(null);
    start(async () => {
      try {
        const res = await fetch(url, { method });
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "unknown error");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {error && <span className="mr-2 text-xs text-status-failed">{error}</span>}
      {state === "RUNNING" && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(`/api/targets/${targetKey}/invocations/${invocationId}`, "DELETE")}
          className="gap-1.5"
        >
          <XCircle className="h-3.5 w-3.5" />
          Cancel
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          run(`/api/targets/${targetKey}/invocations/${invocationId}/rerun`, "POST")
        }
      >
        Rerun all
      </Button>
      <Button
        size="sm"
        disabled={pending || failedCount === 0}
        className="gap-1.5"
        onClick={() =>
          run(
            `/api/targets/${targetKey}/invocations/${invocationId}/rerun?onlyFailed=true`,
            "POST",
          )
        }
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        Rerun failed ({failedCount})
      </Button>
    </div>
  );
}
