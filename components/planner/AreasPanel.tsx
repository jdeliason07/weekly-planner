"use client";

// The Areas window. Each area is a chip showing its pattern, name, target and
// placed hours, and a small type tag. Tapping a chip ARMS it — the armed state
// is inverted (black fill, white text, spine flipped to solid white), so the
// next tap on the grid places a block of that area. Unmistakable.

import { useStore } from "@/lib/store";
import { patternStyle } from "@/lib/patterns";
import { fmtHours } from "@/lib/budget";

export function AreasPanel({ horizontal = false }: { horizontal?: boolean }) {
  const store = useStore();
  const order = store.budget.perArea;

  return (
    <div
      className={
        horizontal
          ? "flex gap-1 overflow-x-auto p-1"
          : "flex flex-col gap-1 p-1"
      }
    >
      {order.map(({ area, targetHours, placedHours }) => {
        const armed = store.armedAreaId === area.id;
        const over = placedHours > targetHours + 0.001;
        return (
          <button
            key={area.id}
            type="button"
            aria-pressed={armed}
            onClick={() => store.arm(armed ? null : area.id)}
            className={`flex shrink-0 items-center gap-2 border border-black px-1 py-1 text-left ${
              armed ? "bg-black text-white" : "bg-white text-black"
            } ${horizontal ? "w-[124px]" : "w-full"}`}
          >
            <span
              aria-hidden
              className="h-6 w-[7px] shrink-0 border border-black"
              style={armed ? { backgroundColor: "#fff" } : patternStyle(area.pattern)}
            />
            <span className="min-w-0 flex-1">
              <span
                className="block truncate font-prose"
                style={{ fontSize: 10, lineHeight: 1.1 }}
              >
                {area.name}
              </span>
              <span className="font-chrome" style={{ fontSize: 8 }}>
                {fmtHours(placedHours)}/{fmtHours(targetHours)}H
                {over ? " OVER" : ""}
              </span>
            </span>
            <span
              className="shrink-0 font-chrome"
              style={{ fontSize: 7, opacity: 0.8 }}
            >
              {area.default_type === "anchor"
                ? "ANC"
                : area.default_type === "sprint"
                ? "SPR"
                : "OPN"}
            </span>
          </button>
        );
      })}
      {order.length === 0 && (
        <p className="p-3 font-prose text-black" style={{ fontSize: 11 }}>
          No areas yet. Add one to start planning your week.
        </p>
      )}
    </div>
  );
}
