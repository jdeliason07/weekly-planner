// The pattern system — the signature of the whole design.
//
// Eleven areas, one bit. Areas are identified by FILL PATTERN, not color.
// The same pattern for an area runs everywhere: meter segments, area chips,
// the spine down the left edge of every block, sync list markers, review bars.
//
// Everything here resolves to pure black (#000) on white (#fff). No color,
// no gradient-as-color, no blur. Where something must read as "gray" we dither.

import type { CSSProperties } from "react";

export type PatternKey =
  | "solid"
  | "checker"
  | "diagR"
  | "diagL"
  | "horiz"
  | "vert"
  | "cross"
  | "dots"
  | "dotsDense"
  | "diagWide"
  | "checkerBig";

// A pattern is expressed as the CSS needed to paint it into a box.
export function patternStyle(key: PatternKey): CSSProperties {
  switch (key) {
    case "solid":
      return { backgroundColor: "#000" };
    case "checker":
      return {
        backgroundColor: "#fff",
        backgroundImage:
          "linear-gradient(45deg,#000 25%,transparent 25%,transparent 75%,#000 75%,#000)," +
          "linear-gradient(45deg,#000 25%,transparent 25%,transparent 75%,#000 75%,#000)",
        backgroundSize: "4px 4px",
        backgroundPosition: "0 0, 2px 2px",
      };
    case "diagR":
      return {
        backgroundImage:
          "repeating-linear-gradient(45deg,#000 0 1px,#fff 1px 4px)",
      };
    case "diagL":
      return {
        backgroundImage:
          "repeating-linear-gradient(135deg,#000 0 1px,#fff 1px 4px)",
      };
    case "horiz":
      return {
        backgroundImage:
          "repeating-linear-gradient(0deg,#000 0 1px,#fff 1px 3px)",
      };
    case "vert":
      return {
        backgroundImage:
          "repeating-linear-gradient(90deg,#000 0 1px,#fff 1px 3px)",
      };
    case "cross":
      return {
        backgroundColor: "#fff",
        backgroundImage:
          "repeating-linear-gradient(0deg,#000 0 1px,transparent 1px 4px)," +
          "repeating-linear-gradient(90deg,#000 0 1px,transparent 1px 4px)",
      };
    case "dots":
      return {
        backgroundColor: "#fff",
        backgroundImage: "radial-gradient(#000 40%,transparent 41%)",
        backgroundSize: "4px 4px",
      };
    case "dotsDense":
      return {
        backgroundColor: "#fff",
        backgroundImage: "radial-gradient(#000 45%,transparent 46%)",
        backgroundSize: "3px 3px",
      };
    case "diagWide":
      return {
        backgroundImage:
          "repeating-linear-gradient(45deg,#000 0 2px,#fff 2px 7px)",
      };
    case "checkerBig":
      return {
        backgroundColor: "#fff",
        backgroundImage:
          "linear-gradient(45deg,#000 25%,transparent 25%,transparent 75%,#000 75%,#000)," +
          "linear-gradient(45deg,#000 25%,transparent 25%,transparent 75%,#000 75%,#000)",
        backgroundSize: "8px 8px",
        backgroundPosition: "0 0, 4px 4px",
      };
  }
}

// Two dither values used as "gray". These are the ONLY grays allowed inside
// the screen, and they are not gray at all — they are 1-bit patterns.
export const GREY50: CSSProperties = {
  // 2px checkerboard — desktop background, done-block overlay, hour rules.
  backgroundColor: "#fff",
  backgroundImage:
    "linear-gradient(45deg,#000 25%,transparent 25%,transparent 75%,#000 75%,#000)," +
    "linear-gradient(45deg,#000 25%,transparent 25%,transparent 75%,#000 75%,#000)",
  backgroundSize: "2px 2px",
  backgroundPosition: "0 0, 1px 1px",
};

export const GREY25: CSSProperties = {
  // radial dots on a 3px grid — disabled fills, planned-not-done bars.
  backgroundColor: "#fff",
  backgroundImage: "radial-gradient(#000 30%,transparent 31%)",
  backgroundSize: "3px 3px",
};

// The horizontal-stripes fill used by title bars (1px black / 1px white).
export const TITLE_STRIPES: CSSProperties = {
  backgroundImage: "repeating-linear-gradient(0deg,#000 0 1px,#fff 1px 2px)",
};

// Vent slats on the chassis (chassis-only, uses chassis tokens, not screen).
export const VENT_SLATS: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(0deg,#a89c84 0 1px,transparent 1px 4px)",
};
