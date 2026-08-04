// The 1-bit CRT. Everything inside is #000 on #fff. No gray, no color, no
// gradient, no blur, no radius (except buttons). The recess and glass framing
// belong to the chassis, so they may use chassis tokens — but the content
// area (`.crt`) is strictly monochrome.

import type { ReactNode } from "react";
import { GREY50 } from "@/lib/patterns";

export function Screen({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col rounded-recess p-1.5 sm:p-2.5"
      style={{
        background: "#2b2822",
        boxShadow: "inset 0 2px 6px rgba(0,0,0,.8), inset 0 -1px 0 #4a453b",
      }}
    >
      <div
        className="crt relative flex min-h-0 flex-1 flex-col overflow-hidden border border-black"
        style={{
          // Desktop is GREY50 dither, exactly like the real Finder.
          ...GREY50,
        }}
      >
        {children}
      </div>
    </div>
  );
}
