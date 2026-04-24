import { cn } from "@/lib/utils";

export interface SparklineProps {
  /** Values in natural order (oldest first). null = no data. */
  data: Array<number | null>;
  width?: number;
  height?: number;
  stroke?: string;
  className?: string;
  strokeWidth?: number;
}

/**
 * Tiny inline sparkline. Nulls render as gaps in the path.
 */
export function Sparkline({
  data,
  width = 120,
  height = 28,
  stroke = "var(--secondary)",
  strokeWidth = 1.25,
  className,
}: SparklineProps) {
  if (data.length === 0) {
    return (
      <div
        className={cn("text-[10px] text-[var(--muted-foreground)]", className)}
        style={{ width, height }}
      >
        no data
      </div>
    );
  }

  const values = data.map((v) => (v == null ? null : v));
  const nums = values.filter((v): v is number => v != null);
  const min = nums.length ? Math.min(...nums) : 0;
  const max = nums.length ? Math.max(...nums) : 1;
  const range = max - min || 1;

  const xStep = data.length > 1 ? width / (data.length - 1) : 0;
  const segments: string[] = [];
  let current: string[] = [];
  values.forEach((v, i) => {
    if (v == null) {
      if (current.length) segments.push(current.join(" "));
      current = [];
      return;
    }
    const x = i * xStep;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    current.push(`${current.length === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
  });
  if (current.length) segments.push(current.join(" "));

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className={cn("block overflow-visible", className)}
    >
      {segments.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />
      ))}
    </svg>
  );
}
