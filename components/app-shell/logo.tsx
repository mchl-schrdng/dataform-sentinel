import { cn } from "@/lib/utils";

export function SentinelLogo({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      {/* Ears */}
      <rect x="1" y="2" width="2" height="1" fill="var(--primary)" />
      <rect x="1" y="3" width="3" height="1" fill="var(--primary)" />
      <rect x="9" y="2" width="2" height="1" fill="var(--primary)" />
      <rect x="8" y="3" width="3" height="1" fill="var(--primary)" />
      {/* Head top */}
      <rect x="1" y="4" width="10" height="1" fill="var(--primary)" />
      {/* Face */}
      <rect x="0" y="5" width="12" height="4" fill="var(--primary)" />
      {/* Chin taper */}
      <rect x="1" y="9" width="10" height="1" fill="var(--primary)" />
      <rect x="3" y="10" width="6" height="1" fill="var(--primary)" />
      {/* Eyes */}
      <rect x="3" y="6" width="1" height="1" fill="#8B2B00" />
      <rect x="8" y="6" width="1" height="1" fill="#8B2B00" />
      {/* Nose */}
      <rect x="5" y="7" width="2" height="1" fill="#8B2B00" />
    </svg>
  );
}
