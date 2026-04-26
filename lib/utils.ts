import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a duration in milliseconds as e.g. "4m 12s" or "11m 03s". */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/** Relative time like "17m ago", "2h ago", "in 14h", "now". */
export function formatRelative(date: Date | string | number | null | undefined): string {
  if (date == null) return "—";
  const t = typeof date === "object" ? date.getTime() : new Date(date).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  const abs = Math.abs(diff);
  if (abs < 15_000) return "now";
  const future = diff < 0;
  const s = Math.floor(abs / 1000);
  if (s < 60) return future ? `in ${s}s` : `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return future ? `in ${m}m` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return future ? `in ${h}h` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return future ? `in ${d}d` : `${d}d ago`;
}

/** Absolute UTC timestamp: "Apr 23, 14:22 UTC". */
export function formatAbsoluteUtc(date: Date | string | number | null | undefined): string {
  if (date == null) return "—";
  const d = typeof date === "object" ? date : new Date(date);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—";
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const day = d.getUTCDate();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${month} ${day}, ${hh}:${mm} UTC`;
}

/** Truncate an ID with an ellipsis in the middle: b7f3...a2c1 */
export function truncateId(id: string, head = 4, tail = 4): string {
  if (id.length <= head + tail + 3) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

