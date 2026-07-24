import type { CSSProperties } from "react";
import { patternStyle, type PatternKey } from "@/lib/patterns";

// A box filled with an area's pattern. When `inverted`, the pattern flips to
// solid white (used inside selected/inverted surfaces).
export function PatternFill({
  pattern,
  inverted = false,
  className = "",
  style,
  title,
}: {
  pattern: PatternKey;
  inverted?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const base = inverted
    ? ({ backgroundColor: "#fff" } as CSSProperties)
    : patternStyle(pattern);
  return (
    <div
      title={title}
      aria-hidden
      className={className}
      style={{ ...base, ...style }}
    />
  );
}
