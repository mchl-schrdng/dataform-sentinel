import { cn } from "@/lib/utils";

/**
 * A tiny pixel-art cat curled up asleep in the corner. Decorative only.
 * - Breathes slowly (scale 1 → 1.04 → 1 over 4s)
 * - Emits "z" letters that float up and fade (3s cycle, two staggered)
 * - Respects `prefers-reduced-motion` — stays still if the user has that enabled
 */
export function SleepyCat({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-4 right-4 z-40 select-none",
        className,
      )}
      aria-hidden
    >
      <div className="relative">
        {/* Floating z's, above and slightly right of the head */}
        <span
          className="animate-cat-zzz-1 absolute -top-1 right-2 font-mono text-[11px] font-bold"
          style={{ color: "#F74F05" }}
        >
          z
        </span>
        <span
          className="animate-cat-zzz-2 absolute -top-2 right-4 font-mono text-[10px] font-bold"
          style={{ color: "#F74F05" }}
        >
          z
        </span>

        {/* Pixel-art loaf cat, ~64×48 visible */}
        <svg
          width="64"
          height="48"
          viewBox="0 0 16 12"
          shapeRendering="crispEdges"
          className="animate-cat-breathe block"
          style={{ color: "#F74F05" }}
        >
          {/* Ears */}
          <rect x="3" y="1" width="2" height="2" fill="currentColor" />
          <rect x="11" y="1" width="2" height="2" fill="currentColor" />
          {/* Head top */}
          <rect x="3" y="3" width="10" height="1" fill="currentColor" />
          {/* Body (main blob) */}
          <rect x="2" y="4" width="12" height="5" fill="currentColor" />
          {/* Bottom taper */}
          <rect x="3" y="9" width="10" height="1" fill="currentColor" />
          <rect x="4" y="10" width="8" height="1" fill="currentColor" />
          {/* Closed eyes */}
          <rect x="5" y="6" width="2" height="1" fill="#8B2B00" />
          <rect x="9" y="6" width="2" height="1" fill="#8B2B00" />
          {/* Nose */}
          <rect x="7" y="7" width="2" height="1" fill="#8B2B00" />
        </svg>
      </div>
    </div>
  );
}
