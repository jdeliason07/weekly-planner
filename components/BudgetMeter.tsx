"use client";

// The budget meter. Persistent, directly under the menu bar at every
// breakpoint. This is the reason the app exists — the best-executed thing on
// the screen.
//
//   168 hrs − sleep − locked external events = available
//   available − allocated = remaining
//
// The hero figure is REMAINING (or OVER BY, inverted). The bar beneath is
// segmented by area and drains as blocks are placed, with a marker showing
// all targets summed so feasibility is visible before a single block lands.

import { useState } from "react";
import type { Budget } from "@/lib/budget";
import { fmtHours } from "@/lib/budget";
import { patternStyle } from "@/lib/patterns";

export function BudgetMeter({ budget }: { budget: Budget }) {
  const { availableHours, allocatedHours, targetsSumHours, isOver, overBy } =
    budget;
  const [open, setOpen] = useState(false);

  // Bar scale: the widest of available, allocated, or targets sum, so
  // over-allocation and the targets marker both stay on-screen.
  const scale = Math.max(availableHours, allocatedHours, targetsSumHours, 1);
  const infeasible = targetsSumHours > availableHours;

  return (
    <div className="shrink-0 border-b-2 border-black bg-white">
      <div className="flex items-stretch">
        {/* Hero readout. Inverts to white-on-black when over. */}
        <div
          className={`flex shrink-0 flex-col justify-center px-3 py-1.5 ${
            isOver ? "bg-black" : "bg-white"
          }`}
          style={{ minWidth: 96 }}
        >
          <span
            className={`font-chrome leading-none ${
              isOver ? "text-white" : "text-black"
            }`}
            style={{ fontSize: 26 }}
          >
            {fmtHours(isOver ? overBy : budget.remainingHours)}
            <span style={{ fontSize: 12 }}>H</span>
          </span>
          <span
            className={`mt-1 font-chrome leading-none ${
              isOver ? "text-white" : "text-black"
            }`}
            style={{ fontSize: 8, letterSpacing: "0.08em" }}
          >
            {isOver ? "OVER BY" : "UNCLAIMED"}
          </span>
        </div>

        {/* Bar + secondary figures. */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 border-l border-black px-2 py-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-chrome text-black" style={{ fontSize: 8 }}>
              {fmtHours(allocatedHours)}H PLANNED / {fmtHours(availableHours)}H FREE
            </span>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              className="shrink-0 font-chrome text-black underline"
              style={{ fontSize: 8 }}
            >
              {open ? "HIDE MATH" : "HOW?"}
            </button>
          </div>

          {/* The segmented bar. */}
          <div className="relative h-5 w-full border border-black bg-white">
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

            {/* Available boundary — everything right of it is over-allocation. */}
            <Tick pct={(availableHours / scale) * 100} variant="avail" />
            {/* Targets-summed marker — feasibility at a glance. */}
            <Tick pct={(targetsSumHours / scale) * 100} variant="targets" />
          </div>
        </div>
      </div>

      {/* The math, on demand. */}
      {open && (
        <div className="border-t border-black px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <Fig v="168" l="HOURS" />
            <Op>−</Op>
            <Fig v={fmtHours(budget.sleepHours)} l="SLEEP" />
            <Op>−</Op>
            <Fig v={fmtHours(budget.lockedExternalHours)} l="LOCKED" />
            <Op>=</Op>
            <Fig v={fmtHours(availableHours)} l="AVAILABLE" />
            <Op>−</Op>
            <Fig v={fmtHours(allocatedHours)} l="PLANNED" />
            <Op>=</Op>
            <Fig
              v={fmtHours(isOver ? overBy : budget.remainingHours)}
              l={isOver ? "OVER BY" : "UNCLAIMED"}
            />
          </div>
          <p
            className="mt-2 font-prose text-black"
            style={{ fontSize: 10, lineHeight: 1.4 }}
          >
            The solid line marks your available hours; the dashed line marks
            every area target added up ({fmtHours(targetsSumHours)}h).
            {infeasible
              ? " Your targets already exceed the hours you have — something has to give before you place a single block."
              : " Your targets fit inside the week."}
          </p>
        </div>
      )}
    </div>
  );
}

function Fig({ v, l }: { v: string; l: string }) {
  return (
    <span className="flex flex-col leading-none">
      <span className="font-chrome text-black" style={{ fontSize: 13 }}>
        {v}
      </span>
      <span className="font-chrome text-black" style={{ fontSize: 7 }}>
        {l}
      </span>
    </span>
  );
}

function Op({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-chrome text-black" style={{ fontSize: 12 }}>
      {children}
    </span>
  );
}

function Tick({ pct, variant }: { pct: number; variant: "avail" | "targets" }) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  return (
    <div
      className="pointer-events-none absolute top-0 h-full"
      style={{ left: `${clamped}%` }}
      title={variant === "avail" ? "Available hours" : "All targets summed"}
    >
      {variant === "avail" ? (
        <div className="h-full w-[2px] -translate-x-1/2 bg-black" />
      ) : (
        <div
          className="h-full w-[2px] -translate-x-1/2"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,#000 0 2px,transparent 2px 4px)",
          }}
        />
      )}
    </div>
  );
}
