"use client";

// The week grid: a time gutter and seven day columns. Tap an empty slot while
// an area is armed to place a one-hour block there. External calendar events
// render locked (never editable). Hour rules are GREY50 dither.

import { useStore, defaultPlacement } from "@/lib/store";
import { GREY50 } from "@/lib/patterns";
import {
  GRID_START_MIN,
  GRID_END_MIN,
  dayLabel,
  hhmmToPercent,
  toMinutes,
} from "@/lib/time";
import { BlockView } from "./Block";
import type { ExternalEvent } from "@/lib/types";

const HOURS: number[] = [];
for (let m = GRID_START_MIN; m <= GRID_END_MIN; m += 60) HOURS.push(m);

export function WeekGrid({ singleColumn }: { singleColumn?: number }) {
  const columns =
    singleColumn === undefined ? [0, 1, 2, 3, 4, 5, 6] : [singleColumn];

  return (
    <div className="flex h-full min-h-[460px] w-full">
      {/* Time gutter */}
      <div className="relative w-8 shrink-0 border-r border-black bg-white">
        {HOURS.map((m) => (
          <div
            key={m}
            className="absolute right-1 -translate-y-1/2 font-chrome text-black"
            style={{ top: `${hhmmToPercent(hhmm(m))}%`, fontSize: 7 }}
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

  function handleSlotClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!store.armedAreaId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientY - rect.top) / rect.height;
    const minutes =
      GRID_START_MIN + frac * (GRID_END_MIN - GRID_START_MIN);
    // Snap to the nearest half hour.
    const snapped = Math.round(minutes / 30) * 30;
    const { start, end } = defaultPlacement(snapped);
    store.place(column, start, end);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col border-r border-black last:border-r-0">
      <div className="flex h-4 items-center justify-center border-b border-black bg-white">
        <span className="font-chrome text-black" style={{ fontSize: 8 }}>
          {label}
        </span>
      </div>
      <div
        className="relative min-h-[440px] flex-1 bg-white"
        onClick={handleSlotClick}
        role={store.armedAreaId ? "button" : undefined}
        aria-label={store.armedAreaId ? `Place block on ${label}` : undefined}
        style={{
          cursor: store.armedAreaId ? "crosshair" : "default",
        }}
      >
        {/* Sabbath wash: a faint dither so Sunday reads as protected. */}
        {isSabbath && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={GREY50}
          />
        )}

        {/* Hour rules — GREY50 dither, 1px tall. */}
        {HOURS.map((m) => (
          <div
            key={m}
            aria-hidden
            className="pointer-events-none absolute left-0 right-0"
            style={{ top: `${hhmmToPercent(hhmm(m))}%`, height: 1, ...GREY50 }}
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
      </div>
    </div>
  );
}

function LockedEvent({ ev }: { ev: ExternalEvent }) {
  const top = hhmmToPercent(ev.start_time);
  const height = hhmmToPercent(ev.end_time) - top;
  return (
    <div
      className="pointer-events-none absolute left-[35%] right-[2px] z-10 overflow-hidden border border-black"
      style={{ top: `${top}%`, height: `${height}%`, minHeight: 12, ...GREY50 }}
      title={`${ev.title} (locked — external calendar event)`}
    >
      <span
        className="block truncate bg-white px-1 font-prose"
        style={{ fontSize: 8, lineHeight: 1.2 }}
      >
        🔒 {ev.title}
      </span>
    </div>
  );
}

function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
