// The outer chassis — Fog-beige injection-molded plastic. Gradients, inset
// highlights and soft drop shadows are allowed HERE ONLY. Everything the user
// plans against lives inside <Screen>, which is strictly 1-bit.

import type { ReactNode } from "react";
import { VENT_SLATS } from "@/lib/patterns";

export function Chassis({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-chassis-page p-3 sm:p-6 flex items-start justify-center">
      <div
        className="w-full max-w-[1200px] rounded-chassis p-3 sm:p-5"
        style={{
          background:
            "linear-gradient(180deg,#e4dccb 0%,#d3c9b4 55%,#c4b9a2 100%)",
          boxShadow:
            "inset 0 1px 0 #f3ecdd, inset 0 -2px 3px #a89c84, 0 12px 28px rgba(0,0,0,.45)",
        }}
      >
        {/* Embossed brand strip with vent slots on either side. */}
        <div className="flex items-center gap-2 sm:gap-3 px-1 pb-3">
          <Vents />
          <div
            className="font-chrome text-chassis-deep select-none"
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
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
      className="h-[10px] flex-1 rounded-[2px]"
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
    <div className="mt-3 px-1 flex items-center justify-between">
      <div
        className="font-chrome text-chassis-deep"
        style={{ fontSize: 9, letterSpacing: "0.1em", textShadow: "0 1px 0 #f3ecdd" }}
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
