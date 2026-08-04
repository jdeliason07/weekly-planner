"use client";

// A placed block. White fill, 1px black border, with a pattern spine down the
// left edge identifying the area. Open blocks use a dashed border and no
// spine fill. Done blocks get a GREY50 overlay and a strikethrough. Unsynced
// blocks carry a small solid black triangle in the top-right. Selection
// inverts the whole block and flips its spine to solid white.

import type { Area, PlannedBlock } from "@/lib/types";
import { effectiveType } from "@/lib/types";
import { patternStyle, GREY50 } from "@/lib/patterns";
import { pxFromHHMM } from "@/lib/grid";
import { durationHours } from "@/lib/time";

export function BlockView({
  block,
  area,
  selected,
  onClick,
  column = 0,
  columns = 1,
}: {
  block: PlannedBlock;
  area: Area;
  selected: boolean;
  onClick: () => void;
  /** Side-by-side position when blocks overlap (see lib/layout.ts). */
  column?: number;
  columns?: number;
}) {
  const type = effectiveType(block, area);
  const isOpen = type === "open";
  const top = pxFromHHMM(block.start_time);
  const height = pxFromHHMM(block.end_time) - top;
  const done = !!block.completed_at;
  const unsynced = block.sync_state === "unsynced" && !isOpen;
  const label = block.label ?? area.name;
  const hours = durationHours(block.start_time, block.end_time);
  const showTime = height >= 34;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="absolute overflow-hidden text-left"
      style={{
        top,
        height: Math.max(height, 18),
        left: `calc(2px + ${(column / columns) * 100}%)`,
        width: `calc(${(1 / columns) * 100}% - 4px)`,
        border: isOpen ? "1px dashed #000" : "1px solid #000",
        background: selected ? "#000" : "#fff",
        color: selected ? "#fff" : "#000",
        boxShadow: selected ? "0 0 0 2px #000" : undefined,
        zIndex: selected ? 15 : 1,
      }}
    >
      {/* Pattern spine. Open blocks have no spine fill. Selection flips it to
          solid white. */}
      {!isOpen && (
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full"
          style={{
            width: 6,
            ...(selected
              ? { backgroundColor: "#fff" }
              : patternStyle(area.pattern)),
          }}
        />
      )}

      {/* Done overlay: GREY50 dither across the block. */}
      {done && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={GREY50}
        />
      )}

      {/* Unsynced marker: solid black triangle, top-right. */}
      {unsynced && !selected && (
        <span
          aria-hidden
          className="absolute right-0 top-0"
          style={{
            width: 0,
            height: 0,
            borderTop: "7px solid #000",
            borderLeft: "7px solid transparent",
          }}
        />
      )}

      <span className="relative block py-[2px] pl-[10px] pr-1">
        <span
          className="block truncate font-prose font-medium"
          style={{
            fontSize: 11,
            lineHeight: "13px",
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {label}
        </span>
        {showTime && (
          <span
            className="block font-chrome"
            style={{ fontSize: 8, lineHeight: "12px", opacity: 0.8 }}
          >
            {block.start_time}
            {hours >= 1 ? ` · ${hours % 1 === 0 ? hours : hours.toFixed(1)}H` : ""}
            {isOpen ? " · OPEN" : ""}
          </span>
        )}
      </span>
    </button>
  );
}
