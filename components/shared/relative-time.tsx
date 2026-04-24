"use client";
import { useEffect, useState } from "react";
import { formatAbsoluteUtc, formatRelative } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface RelativeTimeProps {
  date: string | Date | number | undefined | null;
  /** Seconds between re-renders. */
  intervalSec?: number;
  className?: string;
}

/**
 * Auto-updating relative time with absolute UTC tooltip.
 * Initial render matches server output to avoid hydration mismatch.
 */
export function RelativeTime({ date, intervalSec = 30, className }: RelativeTimeProps) {
  const [label, setLabel] = useState(() => formatRelative(date));
  useEffect(() => {
    setLabel(formatRelative(date));
    const t = setInterval(() => setLabel(formatRelative(date)), intervalSec * 1000);
    return () => clearInterval(t);
  }, [date, intervalSec]);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className}>{label}</span>
      </TooltipTrigger>
      <TooltipContent className="font-mono text-xs">{formatAbsoluteUtc(date)}</TooltipContent>
    </Tooltip>
  );
}
