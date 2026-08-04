// The outer chassis — Fog-beige injection-molded plastic. Gradients, inset
// highlights and soft drop shadows are allowed HERE ONLY. Everything the user
// plans against lives inside <Screen>, which is strictly 1-bit.
//
// The machine fills the viewport and content scrolls INSIDE the screen, so
// from the Home Screen it feels like an appliance, not a webpage.

import type { ReactNode } from "react";
import { VENT_SLATS } from "@/lib/patterns";

export function Chassis({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full justify-center bg-chassis-page p-1.5 sm:p-5">
      <div
        className="flex h-full w-full max-w-[1200px] flex-col rounded-chassis p-2 sm:p-4"
        style={{
          background:
            "linear-gradient(180deg,#e4dccb 0%,#d3c9b4 55%,#c4b9a2 100%)",
          boxShadow:
            "inset 0 1px 0 #f3ecdd, inset 0 -2px 3px #a89c84, 0 12px 28px rgba(0,0,0,.45)",
        }}
      >
        {/* Embossed brand strip with vent slots on either side. */}
        <div className="flex shrink-0 items-center gap-2 px-1 pb-2 sm:gap-3">
          <Vents />
          <div
            className="select-none font-chrome text-chassis-deep"
            style={{
              fontSize: 10,
              letterSpacing: "0.16em",
              textShadow: "0 1px 0 #f3ecdd",
            }}
          >
            WEEK MACHINE
          </div>
          <Vents />
        </div>

        {children}
      </div>
    </div>
  );
}

function Vents() {
  return (
    <div
      aria-hidden
      className="h-[9px] flex-1 rounded-[2px]"
      style={{
        ...VENT_SLATS,
        boxShadow: "inset 0 1px 0 #f3ecdd, inset 0 -1px 0 #8a7f68",
      }}
    />
  );
}

// The chin below the screen — carries the week label and a molded detail.
export function Chin({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-between px-1 pt-2">
      <div
        className="font-chrome text-chassis-deep"
        style={{
          fontSize: 8,
          letterSpacing: "0.12em",
          textShadow: "0 1px 0 #f3ecdd",
        }}
      >
        {children}
      </div>
      {/* Molded detail: a small inset dimple, like the real chin badge. */}
      <div
        aria-hidden
        className="h-2 w-8 rounded-[2px]"
        style={{
          background: "linear-gradient(180deg,#a89c84,#c4b9a2)",
          boxShadow: "inset 0 1px 1px #8a7f68, 0 1px 0 #f3ecdd",
        }}
      />
    </div>
  );
}
