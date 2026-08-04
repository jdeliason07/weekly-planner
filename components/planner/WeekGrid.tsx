"use client";

// The week grid. Renders at a fixed 48px-per-hour scale and scrolls
// vertically inside its window — blocks are readable and tappable instead of
// being crushed into the leftover space. Auto-scrolls to the morning on
// mount, draws a dashed "now" line on today, and shows an unmistakable
// banner while an area is armed.

import { useEffect, useRef, useState } from "react";
import { useStore, defaultPlacement } from "@/lib/store";
import { GREY25, GREY50, patternStyle } from "@/lib/patterns";
import { GRID_START_MIN, GRID_END_MIN, dayLabel } from "@/lib/time";
import {
  GRID_HEIGHT_PX,
  pxFromHHMM,
  pxFromMinutes,
  minutesFromOffsetPx,
} from "@/lib/grid";
import { BlockView } from "./Block";
import type { ExternalEvent } from "@/lib/types";

const HOURS: number[] = [];
for (let m = GRID_START_MIN; m < GRID_END_MIN; m += 60) HOURS.push(m);

export function WeekGrid({ singleColumn }: { singleColumn?: number }) {
  const store = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const columns =
    singleColumn === undefined ? [0, 1, 2, 3, 4, 5, 6] : [singleColumn];

  // Open the day at ~07:00 rather than the very top of the grid.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = pxFromMinutes(7 * 60) - 8;
    }
  }, [singleColumn === undefined]);

  const armedArea = store.areas.find((a) => a.id === store.armedAreaId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Armed banner — the placing state must be unmistakable. */}
      {armedArea && (
        <button
          type="button"
          onClick={() => store.arm(null)}
          className="flex shrink-0 items-center justify-between gap-2 border-b border-black bg-black px-2 py-[5px] text-left"
        >
          <span className="truncate font-chrome text-white" style={{ fontSize: 9 }}>
            PLACING: {armedArea.name.toUpperCase()} — TAP A TIME
          </span>
          <span className="shrink-0 font-chrome text-white" style={{ fontSize: 9 }}>
            CANCEL ✕
          </span>
        </button>
      )}

      {/* Day headers, pinned above the scrolling area. On a single-day view
          the day switcher already names the day, so this would just repeat
          it. */}
      {singleColumn === undefined && (
        <div className="flex shrink-0 border-b border-black bg-white">
          <div className="w-9 shrink-0 border-r border-black" />
          {columns.map((col) => (
            <DayHeader key={col} column={col} />
          ))}
        </div>
      )}

      {/* Empty state — says what to do next, over the grid. */}
      {store.blocks.length === 0 && !armedArea && (
        <div className="shrink-0 border-b border-black bg-white px-3 py-2">
          <p
            className="font-prose text-black"
            style={{ fontSize: 11, lineHeight: 1.4 }}
          >
            Nothing planned yet. Tap an area below to arm it, then tap a time
            to place it — or load your template from the WEEK menu.
          </p>
        </div>
      )}

      {/* The scrolling grid. */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-white">
        <div className="flex" style={{ height: GRID_HEIGHT_PX }}>
          {/* Time gutter */}
          <div className="relative w-9 shrink-0 border-r border-black bg-white">
            {HOURS.map((m) => (
              <div
                key={m}
                className="absolute right-1 font-chrome text-black"
                style={{ top: pxFromMinutes(m) + 2, fontSize: 8 }}
              >
                {String(Math.floor(m / 60)).padStart(2, "0")}
              </div>
            ))}
          </div>

          <div className="flex min-w-0 flex-1">
            {columns.map((col) => (
              <DayColumn key={col} column={col} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayHeader({ column }: { column: number }) {
  const store = useStore();
  const label = dayLabel(column, store.settings.week_starts_on);
  const d = new Date(store.weekStart + "T00:00:00");
  d.setDate(d.getDate() + column);
  return (
    <div className="flex flex-1 items-baseline justify-center gap-1 border-r border-black py-[4px] last:border-r-0">
      <span className="font-chrome text-black" style={{ fontSize: 9 }}>
        {label.toUpperCase()}
      </span>
      <span className="font-chrome text-black" style={{ fontSize: 8, opacity: 0.75 }}>
        {d.getDate()}
      </span>
    </div>
  );
}

function DayColumn({ column }: { column: number }) {
  const store = useStore();
  const label = dayLabel(column, store.settings.week_starts_on);
  const isSabbath = label === "Sun";

  const dayBlocks = store.blocks.filter(
    (b) => store.columnFromDate(b.date) === column
  );
  const dayExternal = store.external.filter(
    (e) => store.columnFromDate(e.date) === column
  );

  // "Now" line — client-only so SSR markup stays stable.
  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    function tick() {
      const n = new Date();
      const local = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
      const isToday = store.columnFromDate(local) === column;
      const mins = n.getHours() * 60 + n.getMinutes();
      setNowMin(
        isToday && mins >= GRID_START_MIN && mins <= GRID_END_MIN ? mins : null
      );
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [column, store]);

  function handleSlotClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!store.armedAreaId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = minutesFromOffsetPx(e.clientY - rect.top);
    // Snap to the nearest half hour.
    const snapped = Math.round(minutes / 30) * 30;
    const { start, end } = defaultPlacement(snapped);
    store.place(column, start, end);
  }

  return (
    <div
      className="relative min-w-0 flex-1 border-r border-black bg-white last:border-r-0"
      onClick={handleSlotClick}
      role={store.armedAreaId ? "button" : undefined}
      aria-label={store.armedAreaId ? `Place block on ${label}` : undefined}
      style={{ cursor: store.armedAreaId ? "crosshair" : "default" }}
    >
      {/* Sabbath wash: a light dot dither so Sunday reads as protected. */}
      {isSabbath && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={GREY25}
        />
      )}

      {/* Hour rules — light dotted lines, calm, not noisy. */}
      {HOURS.slice(1).map((m) => (
        <div
          key={m}
          aria-hidden
          className="pointer-events-none absolute left-0 right-0"
          style={{
            top: pxFromMinutes(m),
            height: 1,
            backgroundImage:
              "repeating-linear-gradient(90deg,#000 0 1px,transparent 1px 4px)",
          }}
        />
      ))}

      {/* Placed blocks. */}
      {dayBlocks.map((b) => {
        const area = store.areas.find((a) => a.id === b.area_id)!;
        return (
          <BlockView
            key={b.id}
            block={b}
            area={area}
            selected={store.selectedBlockId === b.id}
            onClick={() => store.select(b.id)}
          />
        );
      })}

      {/* Locked external events — read-only, drawn ON TOP and offset right
          so a clash with a real commitment is always visible. */}
      {dayExternal.map((ev) => (
        <LockedEvent key={ev.gcal_event_id} ev={ev} />
      ))}

      {/* The "now" line: solid black with a small notch at the gutter. */}
      {nowMin !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 z-20"
          style={{ top: pxFromMinutes(nowMin) }}
        >
          <div className="h-[2px] w-full bg-black" />
          <div
            className="absolute -top-[3px] left-0"
            style={{
              width: 0,
              height: 0,
              borderLeft: "5px solid #000",
              borderTop: "4px solid transparent",
              borderBottom: "4px solid transparent",
            }}
          />
        </div>
      )}
    </div>
  );
}

function LockedEvent({ ev }: { ev: ExternalEvent }) {
  const top = pxFromHHMM(ev.start_time);
  const height = pxFromHHMM(ev.end_time) - top;
  return (
    <div
      className="pointer-events-none absolute left-[30%] right-[2px] z-10 overflow-hidden border border-black"
      style={{ top, height, minHeight: 16, ...GREY50 }}
      title={`${ev.title} (locked — external calendar event)`}
    >
      <span
        className="block truncate bg-white px-1 font-prose"
        style={{ fontSize: 9, lineHeight: "14px" }}
      >
        🔒 {ev.title}
      </span>
    </div>
  );
}
