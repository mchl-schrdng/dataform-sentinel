"use client";
import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RunWorkflowButton({ targetKey, displayName }: { targetKey: string; displayName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const run = () => {
    setError(null);
    start(async () => {
      try {
        const res = await fetch(`/api/targets/${targetKey}/invocations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "unknown error");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Play className="h-3.5 w-3.5 fill-current" />
          Run workflow
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run workflow</DialogTitle>
          <DialogDescription>
            Compile the repository from its default workspace (or git branch if no workspace
            exists) and trigger a full invocation against {displayName}.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-md border border-[color:var(--status-failed)]/30 bg-[color:var(--status-failed)]/5 p-3 text-xs text-status-failed">
            {error}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={run} disabled={pending}>
            {pending ? "Starting…" : "Run now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
