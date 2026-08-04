"use client";

// A placed block. White fill, 1px black border, with a pattern spine down the
// left edge identifying the area. Open blocks use a dashed border and no
// spine fill. Done blocks get a GREY50 overlay and a strikethrough. Unsynced
// blocks carry a small solid black triangle in the top-right.
//
// Selected blocks grow two corner dots — top-left drags the start time,
// bottom-right drags the end. Long-pressing lifts the block so it can be
// dragged to another time or day.

import type { Area, PlannedBlock } from "@/lib/types";
import { effectiveType } from "@/lib/types";
import { patternStyle, GREY50 } from "@/lib/patterns";
import { pxFromMinutes } from "@/lib/grid";
import { toMinutes, toHHMM } from "@/lib/time";

export function BlockView({
  block,
  area,
  selected,
  onClick,
  hourPx,
  column = 0,
  columns = 1,
  /** Live drag override — the block renders here while being dragged. */
  overrideStartMin,
  overrideEndMin,
  lifted = false,
  onPointerDownBlock,
  onPointerUpBlock,
  onResizeStart,
  tabIndex,
}: {
  block: PlannedBlock;
  area: Area;
  selected: boolean;
  onClick: () => void;
  hourPx: number;
  column?: number;
  columns?: number;
  overrideStartMin?: number;
  overrideEndMin?: number;
  lifted?: boolean;
  onPointerDownBlock?: (e: React.PointerEvent) => void;
  onPointerUpBlock?: (e: React.PointerEvent) => void;
  onResizeStart?: (e: React.PointerEvent, edge: "start" | "end") => void;
  /** -1 for blocks in an off-screen pager neighbour, so focus can't land there. */
  tabIndex?: number;
}) {
  const type = effectiveType(block, area);
  const isOpen = type === "open";

  const startMin = overrideStartMin ?? toMinutes(block.start_time);
  const endMin = overrideEndMin ?? toMinutes(block.end_time);
  const top = pxFromMinutes(startMin, hourPx);
  const height = pxFromMinutes(endMin, hourPx) - top;

  const done = !!block.completed_at;
  const unsynced = block.sync_state === "unsynced" && !isOpen;
  const label = block.label ?? area.name;
  const hours = (endMin - startMin) / 60;
  const showTime = height >= 30;
  const inverted = selected || lifted;

  return (
    <div
      className="absolute"
      style={{
        top,
        height: Math.max(height, 16),
        left: `calc(2px + ${(column / columns) * 100}%)`,
        width: `calc(${(1 / columns) * 100}% - 4px)`,
        zIndex: lifted ? 40 : selected ? 15 : 1,
        // The lift: the block rises off the grid and follows your finger.
        transform: lifted ? "scale(1.04)" : undefined,
        transition: lifted ? "none" : "transform 120ms ease-out",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        onPointerDown={onPointerDownBlock}
        onPointerUp={onPointerUpBlock}
        tabIndex={tabIndex}
        aria-pressed={selected}
        className="relative h-full w-full overflow-hidden text-left"
        style={{
          border: isOpen ? "1px dashed #000" : "1px solid #000",
          background: inverted ? "#000" : "#fff",
          color: inverted ? "#fff" : "#000",
          boxShadow: lifted
            ? "4px 4px 0 #000"
            : selected
            ? "0 0 0 2px #000"
            : undefined,
          touchAction: "none",
        }}
      >
        {/* Pattern spine. Open blocks have no spine fill. */}
        {!isOpen && (
          <span
            aria-hidden
            className="absolute left-0 top-0 h-full"
            style={{
              width: 6,
              ...(inverted
                ? { backgroundColor: "#fff" }
                : patternStyle(area.pattern)),
            }}
          />
        )}

        {done && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={GREY50}
          />
        )}

        {unsynced && !inverted && (
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
              style={{ fontSize: 8, lineHeight: "12px", opacity: 0.85 }}
            >
              {toHHMM(startMin)}
              {hours >= 0.75
                ? ` · ${hours % 1 === 0 ? hours : hours.toFixed(2).replace(/0$/, "")}H`
                : ""}
              {isOpen ? " · OPEN" : ""}
            </span>
          )}
        </span>
      </button>

      {/* Resize dots: top-left sets the start, bottom-right sets the end. */}
      {selected && onResizeStart && (
        <>
          <ResizeDot
            position="start"
            onPointerDown={(e) => onResizeStart(e, "start")}
          />
          <ResizeDot
            position="end"
            onPointerDown={(e) => onResizeStart(e, "end")}
          />
        </>
      )}
    </div>
  );
}

function ResizeDot({
  position,
  onPointerDown,
}: {
  position: "start" | "end";
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const isStart = position === "start";
  return (
    <span
      role="slider"
      tabIndex={0}
      aria-label={isStart ? "Drag to change start time" : "Drag to change end time"}
      aria-valuetext={isStart ? "start time" : "end time"}
      onPointerDown={onPointerDown}
      className="absolute z-10 rounded-full border-2 border-black bg-white"
      style={{
        width: 15,
        height: 15,
        touchAction: "none",
        cursor: "ns-resize",
        // Straddle the corner so the dot is grabbable from outside the block.
        top: isStart ? -8 : undefined,
        bottom: isStart ? undefined : -8,
        left: isStart ? -6 : undefined,
        right: isStart ? undefined : -6,
        boxShadow: "1px 1px 0 #000",
      }}
    />
  );
}
