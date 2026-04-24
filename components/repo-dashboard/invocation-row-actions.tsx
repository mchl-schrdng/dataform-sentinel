"use client";
import { MoreHorizontal, ExternalLink, Play, RotateCcw, Copy, XCircle, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { InvocationState } from "@/lib/dataform/types";

export interface InvocationRowActionsProps {
  targetKey: string;
  invocationId: string;
  state: InvocationState;
  failedCount: number;
}

export function InvocationRowActions({
  targetKey,
  invocationId,
  state,
  failedCount,
}: InvocationRowActionsProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const post = (url: string, method = "POST") => {
    start(async () => {
      try {
        const res = await fetch(url, { method });
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
        router.refresh();
      } catch (e) {
        console.error("invocation action failed", e);
        window.alert(e instanceof Error ? e.message : "action failed");
      }
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invocationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* no-op */
    }
  };

  const base = `/api/targets/${targetKey}/invocations/${invocationId}`;
  const isRunning = state === "RUNNING";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Invocation actions"
          className="h-6 w-6 opacity-60 hover:opacity-100 data-[state=open]:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/repos/${targetKey}/invocations/${invocationId}`} className="cursor-pointer">
            <ExternalLink className="h-3.5 w-3.5" />
            View detail
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            post(`${base}/rerun`);
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Rerun all
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={pending || failedCount === 0}
          onSelect={(e) => {
            e.preventDefault();
            post(`${base}/rerun?onlyFailed=true`);
          }}
        >
          <Play className="h-3.5 w-3.5" />
          Rerun failed {failedCount > 0 ? `(${failedCount})` : ""}
        </DropdownMenuItem>
        {isRunning && (
          <DropdownMenuItem
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault();
              post(base, "DELETE");
            }}
            className="text-status-failed focus:text-status-failed"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            copy();
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Copy invocation ID"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
