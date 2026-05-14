import { cn } from "@/lib/utils";

/**
 * Inline-SVG consensus sparkline.
 *
 * Renders a 0–100% trend line. Phase 2 has no predictions yet, so the
 * default points draw a flat line at the supplied baseline. Phase 3
 * replaces the `points` prop with sampled data from predictions.
 *
 * No library dependency: ~30 lines of SVG.
 */
export function ConsensusSparkline({
  points,
  className,
  ariaLabel = "Consensus over time",
}: {
  /** Array of values 0–1, sampled evenly across the market's life. */
  points?: number[];
  className?: string;
  ariaLabel?: string;
}) {
  // Fallback to a flat baseline; Phase 3 will pass real data.
  const data = points && points.length >= 2 ? points : [0.5, 0.5];
  const width = 100;
  const height = 32;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const path = data
    .map((v, i) => {
      const x = i * step;
      const y = height - Math.max(0, Math.min(1, v)) * height;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const fillPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
      className={cn("h-8 w-full text-muted-foreground", className)}
    >
      <path d={fillPath} fill="currentColor" opacity={0.08} />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
