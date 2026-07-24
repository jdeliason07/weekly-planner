"use client";

// The budget meter. Persistent, directly under the menu bar at every
// breakpoint. This is the reason the app exists — the best-executed thing on
// the screen.
//
//   168 hrs − sleep − locked external events = available
//   available − allocated = remaining
//
// A horizontal bar segmented by area drains as blocks are placed. A marker
// shows all targets summed, so feasibility is visible before a single block is
// placed. When allocation exceeds available, the readout inverts to
// white-on-black and reads "OVER BY". The action is never blocked.

import type { Budget } from "@/lib/budget";
import { fmtHours } from "@/lib/budget";
import { patternStyle } from "@/lib/patterns";

export function BudgetMeter({ budget }: { budget: Budget }) {
  const { availableHours, allocatedHours, targetsSumHours, isOver, overBy } =
    budget;

  // Bar scale: the widest of available, allocated, or targets sum, so the
  // over-allocation and the targets marker both stay on-screen.
  const scale = Math.max(availableHours, allocatedHours, targetsSumHours, 1);

  return (
    <div className="shrink-0 border-b border-black bg-white px-2 py-2 sm:px-3">
      {/* The equation, in Silkscreen. */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Figure label="HRS" value="168" />
        <Op>−</Op>
        <Figure label="SLEEP" value={fmtHours(budget.sleepHours)} />
        <Op>−</Op>
        <Figure label="LOCKED" value={fmtHours(budget.lockedExternalHours)} />
        <Op>=</Op>
        <Figure label="AVAILABLE" value={fmtHours(availableHours)} big />

        <div className="ml-auto">
          <Remaining isOver={isOver} overBy={overBy} remaining={budget.remainingHours} />
        </div>
      </div>

      {/* The segmented bar. */}
      <div className="relative mt-2 h-6 w-full border border-black bg-white">
        <div className="absolute inset-0 flex">
          {budget.perArea.map(({ area, placedHours }) => {
            if (placedHours <= 0) return null;
            const pct = (placedHours / scale) * 100;
            return (
              <div
                key={area.id}
                title={`${area.name} — ${fmtHours(placedHours)}h`}
                className="h-full border-r border-black"
                style={{ width: `${pct}%`, ...patternStyle(area.pattern) }}
              />
            );
          })}
        </div>

        {/* Available boundary — a solid black tick where the bar runs out of
            available time. Everything to its right is over-allocation. */}
        <Tick
          pct={(availableHours / scale) * 100}
          label="AVAIL"
          variant="avail"
        />

        {/* Targets-summed marker — feasibility at a glance. */}
        <Tick
          pct={(targetsSumHours / scale) * 100}
          label="TARGETS"
          variant="targets"
        />
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span className="font-chrome text-black" style={{ fontSize: 8 }}>
          ALLOCATED {fmtHours(allocatedHours)}H
        </span>
        <span className="font-chrome text-black" style={{ fontSize: 8 }}>
          TARGETS SUM {fmtHours(targetsSumHours)}H
          {targetsSumHours > availableHours ? " · INFEASIBLE" : ""}
        </span>
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  big = false,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div className="flex flex-col leading-none">
      <span
        className="font-chrome text-black"
        style={{ fontSize: big ? 22 : 14 }}
      >
        {value}
      </span>
      <span className="font-chrome text-black" style={{ fontSize: 8 }}>
        {label}
      </span>
    </div>
  );
}

function Op({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-chrome text-black" style={{ fontSize: 16 }}>
      {children}
    </span>
  );
}

function Remaining({
  isOver,
  overBy,
  remaining,
}: {
  isOver: boolean;
  overBy: number;
  remaining: number;
}) {
  if (isOver) {
    // Inverts to white-on-black.
    return (
      <div className="bg-black px-2 py-1 text-right">
        <div className="font-chrome text-white" style={{ fontSize: 22 }}>
          {fmtHours(overBy)}
        </div>
        <div className="font-chrome text-white" style={{ fontSize: 8 }}>
          OVER BY
        </div>
      </div>
    );
  }
  return (
    <div className="px-2 py-1 text-right">
      <div className="font-chrome text-black" style={{ fontSize: 22 }}>
        {fmtHours(remaining)}
      </div>
      <div className="font-chrome text-black" style={{ fontSize: 8 }}>
        REMAINING
      </div>
    </div>
  );
}

function Tick({
  pct,
  label,
  variant,
}: {
  pct: number;
  label: string;
  variant: "avail" | "targets";
}) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  return (
    <div
      className="pointer-events-none absolute top-0 h-full"
      style={{ left: `${clamped}%` }}
    >
      {variant === "avail" ? (
        // Solid black line.
        <div className="h-full w-[2px] -translate-x-1/2 bg-black" />
      ) : (
        // Dashed 1-bit line for the targets marker (distinct from AVAIL).
        <div
          className="h-full w-[2px] -translate-x-1/2"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,#000 0 2px,transparent 2px 4px)",
          }}
        />
      )}
      <div
        className="absolute -translate-x-1/2 whitespace-nowrap bg-white px-[2px] font-chrome text-black"
        style={{
          fontSize: 7,
          top: variant === "avail" ? -1 : undefined,
          bottom: variant === "targets" ? -1 : undefined,
        }}
      >
        {label}
      </div>
    </div>
  );
}
