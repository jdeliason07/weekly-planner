"use client";

// The REVIEW view. One honest signal: am I actually giving each area the time
// I claimed? Planned vs. completed hours, per area. Done hours render in the
// area's pattern; planned-but-not-done renders GREY25. Nothing else — no
// streaks, no scores, no analytics.

import { useStore } from "@/lib/store";
import { Window } from "@/components/chrome/Window";
import { patternStyle, GREY25 } from "@/lib/patterns";
import { fmtHours } from "@/lib/budget";
import { durationHours } from "@/lib/time";

export function ReviewView() {
  const store = useStore();

  const rows = store.budget.perArea.map(({ area, placedHours }) => {
    const doneHours = store.blocks
      .filter((b) => b.area_id === area.id && b.completed_at)
      .reduce((s, b) => s + durationHours(b.start_time, b.end_time), 0);
    return { area, placedHours, doneHours };
  });

  const maxPlanned = Math.max(1, ...rows.map((r) => r.placedHours));
  const totalPlanned = rows.reduce((s, r) => s + r.placedHours, 0);
  const totalDone = rows.reduce((s, r) => s + r.doneHours, 0);
  const anyPlanned = totalPlanned > 0;

  return (
    <div className="flex h-full items-start justify-center overflow-auto p-1">
      <Window title="Weekly review" className="w-full max-w-[560px]">
        {!anyPlanned ? (
          <div className="p-6">
            <p className="text-center font-prose text-black" style={{ fontSize: 12, lineHeight: 1.4 }}>
              Nothing planned this week yet. Go to PLAN, arm an area, and tap
              the grid — then come back here after the week to see how it went.
            </p>
          </div>
        ) : (
          <div className="p-2">
            <div className="mb-2 flex items-baseline justify-between border-b border-black pb-1">
              <span className="font-chrome text-black" style={{ fontSize: 9 }}>
                PLANNED {fmtHours(totalPlanned)}H · DONE {fmtHours(totalDone)}H
              </span>
              <span className="font-chrome text-black" style={{ fontSize: 8 }}>
                WEEK OF {store.weekStart}
              </span>
            </div>

            {rows
              .filter((r) => r.placedHours > 0)
              .map(({ area, placedHours, doneHours }) => {
                const donePct = Math.min(100, (doneHours / maxPlanned) * 100);
                const planPct = Math.min(100, (placedHours / maxPlanned) * 100);
                return (
                  <div key={area.id} className="mb-2">
                    <div className="flex items-baseline justify-between">
                      <span className="truncate font-prose text-black" style={{ fontSize: 11 }}>
                        {area.name}
                      </span>
                      <span className="shrink-0 font-chrome text-black" style={{ fontSize: 8 }}>
                        {fmtHours(doneHours)}/{fmtHours(placedHours)}H
                      </span>
                    </div>
                    {/* Planned bar (GREY25) with the done portion overlaid in
                        the area's pattern. */}
                    <div className="relative mt-[2px] h-4 w-full border border-black bg-white">
                      <div
                        className="absolute inset-y-0 left-0"
                        style={{ width: `${planPct}%`, ...GREY25 }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 border-r border-black"
                        style={{
                          width: `${donePct}%`,
                          ...(doneHours > 0 ? patternStyle(area.pattern) : {}),
                          ...(doneHours === 0 ? { borderRight: "none" } : {}),
                        }}
                      />
                    </div>
                  </div>
                );
              })}

            <p className="mt-3 border-t border-black pt-2 font-prose text-black" style={{ fontSize: 10, lineHeight: 1.4 }}>
              Done hours fill with the area&apos;s pattern; planned-but-not-done
              stays dotted. Mark blocks done from the grid — select a block,
              then Mark Done.
            </p>
          </div>
        )}
      </Window>
    </div>
  );
}
