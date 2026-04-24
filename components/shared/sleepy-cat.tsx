import type { CatMood } from "@/lib/dataform/cat-signal";
import { cn } from "@/lib/utils";

/**
 * A tiny pixel-art cat curled up in the corner. Its expression reacts to the
 * global pipeline state:
 *   - sleeping  → both eyes closed, "z" letters float up
 *   - watching  → one eye open (a run is in progress), "?" floats up
 *   - worried   → slits + frown eyebrows, "!" floats up
 *
 * Pure SVG + CSS. Server Component. Respects `prefers-reduced-motion`.
 */
export function SleepyCat({
  mood = "sleeping",
  className,
}: {
  mood?: CatMood;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-4 right-4 z-40 select-none",
        className,
      )}
      aria-hidden
    >
      <div className="relative">
        <CatGlyph mood={mood} />
        <CatBody mood={mood} />
      </div>
    </div>
  );
}

function CatGlyph({ mood }: { mood: CatMood }) {
  const glyph = mood === "watching" ? "?" : mood === "worried" ? "!" : "z";
  const color =
    mood === "worried"
      ? "var(--status-failed)"
      : mood === "watching"
        ? "var(--status-running)"
        : "#F74F05";
  return (
    <>
      <span
        className="animate-cat-zzz-1 absolute -top-1 right-2 font-mono text-[11px] font-bold"
        style={{ color }}
      >
        {glyph}
      </span>
      <span
        className="animate-cat-zzz-2 absolute -top-2 right-4 font-mono text-[10px] font-bold"
        style={{ color }}
      >
        {glyph}
      </span>
    </>
  );
}

const FACE_DARK = "#8B2B00";

function CatBody({ mood }: { mood: CatMood }) {
  return (
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

      {/* Eyes + brows vary with mood */}
      {mood === "sleeping" && (
        <>
          <rect x="5" y="6" width="2" height="1" fill={FACE_DARK} />
          <rect x="9" y="6" width="2" height="1" fill={FACE_DARK} />
        </>
      )}
      {mood === "watching" && (
        <>
          {/* Left eye: still closed line. Right eye: open dot. */}
          <rect x="5" y="6" width="2" height="1" fill={FACE_DARK} />
          <rect x="10" y="6" width="1" height="1" fill={FACE_DARK} />
        </>
      )}
      {mood === "worried" && (
        <>
          {/* Frown brows — slope down toward the nose */}
          <rect x="4" y="4" width="1" height="1" fill={FACE_DARK} />
          <rect x="5" y="5" width="1" height="1" fill={FACE_DARK} />
          <rect x="11" y="4" width="1" height="1" fill={FACE_DARK} />
          <rect x="10" y="5" width="1" height="1" fill={FACE_DARK} />
          {/* Eye slits */}
          <rect x="5" y="6" width="1" height="1" fill={FACE_DARK} />
          <rect x="10" y="6" width="1" height="1" fill={FACE_DARK} />
        </>
      )}

      {/* Nose */}
      <rect x="7" y="7" width="2" height="1" fill={FACE_DARK} />
    </svg>
  );
}
