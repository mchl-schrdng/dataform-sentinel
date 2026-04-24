import { cn } from "@/lib/utils";

export function SentinelLogo({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path
        d="M4 11 L11 4 L18 11 L11 18 Z"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="11" r="2.4" fill="var(--primary)" />
    </svg>
  );
}
