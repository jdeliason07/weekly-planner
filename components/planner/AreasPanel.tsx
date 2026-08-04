"use client";

// The Areas window. Each area is a chip showing its pattern, name, a small
// progress bar against its target, and its type. Tapping a chip ARMS it —
// the armed state inverts (black fill, white text, spine flipped to solid
// white) so the next tap on the grid places a block of that area.

import { useStore } from "@/lib/store";
import { patternStyle } from "@/lib/patterns";
import { fmtHours } from "@/lib/budget";
import type { Area } from "@/lib/types";

export function AreasPanel({ horizontal = false }: { horizontal?: boolean }) {
  const store = useStore();
  const order = store.budget.perArea;

  if (order.length === 0) {
    return (
      <p className="p-3 font-prose text-black" style={{ fontSize: 11, lineHeight: 1.4 }}>
        No areas yet. Open AREAS in the menu to add your first one.
      </p>
    );
  }

  return (
    <div
      className={
        horizontal
          ? "grid grid-flow-col gap-1 overflow-x-auto p-1 [grid-auto-columns:132px] [grid-template-rows:repeat(2,auto)]"
          : "flex flex-col gap-1 p-1"
      }
    >
      {order.map(({ area, targetHours, placedHours }) => (
        <AreaChip
          key={area.id}
          area={area}
          targetHours={targetHours}
          placedHours={placedHours}
          armed={store.armedAreaId === area.id}
          onToggle={() =>
            store.arm(store.armedAreaId === area.id ? null : area.id)
          }
        />
      ))}
    </div>
  );
}

function AreaChip({
  area,
  targetHours,
  placedHours,
  armed,
  onToggle,
}: {
  area: Area;
  targetHours: number;
  placedHours: number;
  armed: boolean;
  onToggle: () => void;
}) {
  const pct =
    targetHours > 0 ? Math.min(100, (placedHours / targetHours) * 100) : 0;
  const over = placedHours > targetHours + 0.001;

  return (
    <button
      type="button"
      aria-pressed={armed}
      onClick={onToggle}
      className={`flex w-full items-center gap-2 border border-black px-1.5 py-1.5 text-left ${
        armed ? "bg-black text-white" : "bg-white text-black"
      }`}
      style={armed ? { boxShadow: "0 0 0 2px #000" } : undefined}
    >
      <span
        aria-hidden
        className="h-8 w-[8px] shrink-0 border border-black"
        style={armed ? { backgroundColor: "#fff" } : patternStyle(area.pattern)}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-1">
          <span
            className="truncate font-prose font-medium"
            style={{ fontSize: 11, lineHeight: "13px" }}
          >
            {area.name}
          </span>
          <span
            className="shrink-0 font-chrome"
            style={{ fontSize: 7, opacity: 0.75 }}
          >
            {area.default_type === "anchor"
              ? "ANC"
              : area.default_type === "sprint"
              ? "SPR"
              : "OPN"}
          </span>
        </span>

        {/* Progress toward this area's target. */}
        <span
          className="mt-[3px] block h-[5px] w-full border"
          style={{ borderColor: armed ? "#fff" : "#000" }}
        >
          <span
            className="block h-full"
            style={{
              width: `${pct}%`,
              backgroundColor: armed ? "#fff" : "#000",
            }}
          />
        </span>

        <span
          className="mt-[2px] block font-chrome"
          style={{ fontSize: 8, lineHeight: "10px" }}
        >
          {fmtHours(placedHours)}/{fmtHours(targetHours)}H{over ? " · OVER" : ""}
        </span>
      </span>
    </button>
  );
}
