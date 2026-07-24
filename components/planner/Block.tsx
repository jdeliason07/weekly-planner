"use client";

// A placed block. White fill, 1px black border, a 7px pattern spine down the
// left identifying the area. Open blocks use a dashed border and no spine
// fill. Done blocks get a GREY50 overlay and a strikethrough. Unsynced blocks
// carry a small solid black triangle in the top-right. Selection inverts the
// whole block and flips its spine to solid white.

import type { Area, PlannedBlock } from "@/lib/types";
import { effectiveType } from "@/lib/types";
import { patternStyle, GREY50 } from "@/lib/patterns";
import { hhmmToPercent } from "@/lib/time";

export function BlockView({
  block,
  area,
  selected,
  onClick,
}: {
  block: PlannedBlock;
  area: Area;
  selected: boolean;
  onClick: () => void;
}) {
  const type = effectiveType(block, area);
  const isOpen = type === "open";
  const top = hhmmToPercent(block.start_time);
  const bottom = hhmmToPercent(block.end_time);
  const height = bottom - top;
  const done = !!block.completed_at;
  const unsynced = block.sync_state === "unsynced" && !isOpen;
  const label = block.label ?? area.name;
  const tall = height > 6; // enough room for the time line

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="absolute left-[2px] right-[2px] overflow-hidden text-left"
      style={{
        top: `${top}%`,
        height: `${height}%`,
        minHeight: 14,
        border: isOpen ? "1px dashed #000" : "1px solid #000",
        background: selected ? "#000" : "#fff",
        color: selected ? "#fff" : "#000",
      }}
    >
      {/* Pattern spine. Open blocks have no spine fill. Selection flips it to
          solid white. */}
      {!isOpen && (
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full"
          style={{
            width: 7,
            ...(selected ? { backgroundColor: "#fff" } : patternStyle(area.pattern)),
          }}
        />
      )}

      {/* Done overlay: GREY50 dither across the block. */}
      {done && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
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
            borderTop: "6px solid #000",
            borderLeft: "6px solid transparent",
          }}
        />
      )}

      <span className="relative block pl-[10px] pr-1 pt-[1px]">
        <span
          className="block truncate font-prose"
          style={{
            fontSize: 9,
            lineHeight: 1.1,
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {label}
          {isOpen ? " (open)" : ""}
        </span>
        {tall && (
          <span
            className="block font-chrome"
            style={{ fontSize: 8, opacity: 0.85 }}
          >
            {block.start_time}
          </span>
        )}
      </span>
    </button>
  );
}
