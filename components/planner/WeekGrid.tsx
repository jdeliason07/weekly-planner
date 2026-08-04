"use client";

// The week grid. Renders at a variable pixels-per-hour scale and scrolls
// vertically. Gestures:
//
//   • drag horizontally on a day    → the day tracks your finger; release
//                                     settles onto the next / previous day
//   • pinch (or ctrl+wheel)         → zoom from whole-day to 15-minute detail
//   • long-press a block            → lift and drag it to another time
//   • drag a lifted block to an edge→ the day steps and the block follows
//   • drag a selected block's dots  → resize from either end
//
// In single-day view the grid is a pager: the previous and next days are
// mounted either side of the visible one, so a swipe reveals real content
// sliding in rather than cutting to it.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore, defaultPlacement } from "@/lib/store";
import { GREY25, GREY50 } from "@/lib/patterns";
import { GRID_START_MIN, GRID_END_MIN, dayLabel, toHHMM } from "@/lib/time";
import {
  ZOOM_LEVELS,
  DEFAULT_ZOOM,
  gridHeightPx,
  pxFromHHMM,
  pxFromMinutes,
  minutesFromOffsetPx,
  snapMinutes,
} from "@/lib/grid";
import { BlockView } from "./Block";
import { layoutDay } from "@/lib/layout";
import { useBlockGestures } from "./useBlockGestures";
import { useSurfaceGestures } from "./useSurfaceGestures";
import { MacBtn } from "@/components/chrome/MacBtn";
import type { ExternalEvent } from "@/lib/types";

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function WeekGrid({
  singleColumn,
  onDayStep,
}: {
  singleColumn?: number;
  onDayStep?: (dir: 1 | -1) => boolean;
}) {
  const store = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM);

  const isSingle = singleColumn !== undefined;
  const columns = isSingle ? [singleColumn] : [0, 1, 2, 3, 4, 5, 6];

  const stepDay = useMemo(() => onDayStep ?? (() => false), [onDayStep]);

  const dateForOffset = useCallback(
    (offset: number) => {
      const d = new Date(store.weekStart + "T00:00:00");
      d.setDate(d.getDate() + offset);
      return localISO(d);
    },
    [store.weekStart]
  );

  // ---- block drag / resize -------------------------------------------------
  const { preview, beginMove, beginResize, cancelPending } = useBlockGestures({
    hourPx: ZOOM_LEVELS[zoomIndex].hourPx,
    snap: ZOOM_LEVELS[zoomIndex].snap,
    columnCount: columns.length,
    columnsRef,
    onDayStep: stepDay,
    onCommit: (blockId, change) => {
      store.moveBlockTo(blockId, {
        start: toHHMM(change.startMin),
        end: toHHMM(change.endMin),
        columnDelta: change.columnDelta,
      });
    },
  });

  // ---- pinch zoom / swipe --------------------------------------------------
  const { livePinchPx, swipe, settleMs, surfaceHandlers } = useSurfaceGestures({
    zoomIndex,
    setZoomIndex,
    swipeEnabled: isSingle,
    onSwipe: (dir) => stepDay(dir),
    pageWidthRef: columnsRef,
    suspended: !!preview?.lifted,
  });

  const hourPx = livePinchPx ?? ZOOM_LEVELS[zoomIndex].hourPx;
  const level = ZOOM_LEVELS[zoomIndex];
  const height = gridHeightPx(hourPx);

  // Keep the middle of the view anchored while zooming.
  const anchorRef = useRef<number | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (anchorRef.current == null) {
      anchorRef.current = minutesFromOffsetPx(
        el.scrollTop + el.clientHeight / 2,
        hourPx
      );
      return;
    }
    el.scrollTop = Math.max(
      0,
      pxFromMinutes(anchorRef.current, hourPx) - el.clientHeight / 2
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hourPx]);

  useEffect(() => {
    anchorRef.current = null;
  }, [zoomIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = pxFromMinutes(7 * 60, hourPx) - 8;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSingle]);

  // Selecting a block reveals its resize dots — and shrinks the viewport by
  // raising the selection bar. Scroll so both dots stay reachable.
  const selectedId = store.selectedBlockId;
  useEffect(() => {
    if (!selectedId) return;
    const el = scrollRef.current;
    const block = store.weekBlocks.find((b) => b.id === selectedId);
    if (!el || !block) return;
    const pad = 14;
    const top = pxFromHHMM(block.start_time, hourPx) - pad;
    const bottom = pxFromHHMM(block.end_time, hourPx) + pad;
    if (top < el.scrollTop) {
      el.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    } else if (bottom > el.scrollTop + el.clientHeight) {
      el.scrollTo({ top: bottom - el.clientHeight, behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, hourPx]);

  const armedArea = store.areas.find((a) => a.id === store.armedAreaId);
  const hours: number[] = [];
  for (let m = GRID_START_MIN; m < GRID_END_MIN; m += 60) hours.push(m);

  const minorLines: number[] = [];
  if (level.minor && hourPx >= 48) {
    for (let m = GRID_START_MIN; m < GRID_END_MIN; m += level.minor) {
      if (m % 60 !== 0) minorLines.push(m);
    }
  }

  const swiping = swipe.dx !== 0 || swipe.settling;

  const dayColProps = {
    hourPx,
    snap: level.snap,
    hours,
    minorLines,
    columnCount: columns.length,
    preview,
    beginMove,
    beginResize,
    cancelPending,
    dateForOffset,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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

      <div className="flex shrink-0 items-center gap-1 border-b border-black bg-white px-1.5 py-1">
        <span className="font-chrome text-black" style={{ fontSize: 7, opacity: 0.7 }}>
          ZOOM
        </span>
        <MacBtn
          onClick={() => setZoomIndex(Math.max(0, zoomIndex - 1))}
          disabled={zoomIndex === 0}
          aria-label="Zoom out"
          className="!px-2"
        >
          −
        </MacBtn>
        <span className="w-8 text-center font-chrome text-black" style={{ fontSize: 8 }}>
          {level.label}
        </span>
        <MacBtn
          onClick={() => setZoomIndex(Math.min(ZOOM_LEVELS.length - 1, zoomIndex + 1))}
          disabled={zoomIndex === ZOOM_LEVELS.length - 1}
          aria-label="Zoom in"
          className="!px-2"
        >
          +
        </MacBtn>
        {preview?.lifted ? (
          <span className="ml-auto truncate font-chrome text-black" style={{ fontSize: 8 }}>
            {toHHMM(preview.startMin)}–{toHHMM(preview.endMin)}
            {preview.edge ? (preview.edge === "next" ? " · → NEXT DAY" : " · ← PREV DAY") : ""}
          </span>
        ) : (
          isSingle && (
            <span
              className="ml-auto font-chrome text-black"
              style={{ fontSize: 7, opacity: 0.6 }}
            >
              SWIPE TO CHANGE DAY · PINCH TO ZOOM
            </span>
          )
        )}
      </div>

      {!isSingle && (
        <div className="flex shrink-0 border-b border-black bg-white">
          <div className="w-9 shrink-0 border-r border-black" />
          {columns.map((col) => (
            <DayHeader key={col} column={col} />
          ))}
        </div>
      )}

      {store.weekBlocks.length === 0 && !armedArea && (
        <div className="shrink-0 border-b border-black bg-white px-3 py-2">
          <p className="font-prose text-black" style={{ fontSize: 11, lineHeight: 1.4 }}>
            Nothing planned yet. Tap an area below to arm it, then tap a time
            to place it — or load your template from the WEEK menu.
          </p>
        </div>
      )}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto bg-white"
        style={{ touchAction: preview?.lifted ? "none" : "pan-y" }}
        {...surfaceHandlers}
      >
        <div className="flex" style={{ height }}>
          <div className="relative w-9 shrink-0 border-r border-black bg-white">
            {hours.map((m) => (
              <div
                key={m}
                className="absolute right-1 font-chrome text-black"
                style={{ top: pxFromMinutes(m, hourPx) + 2, fontSize: 8 }}
              >
                {String(Math.floor(m / 60)).padStart(2, "0")}
              </div>
            ))}
          </div>

          {isSingle ? (
            // Pager: yesterday / today / tomorrow, translated as one track so
            // the neighbouring day is really there under your thumb.
            <div ref={columnsRef} className="relative min-w-0 flex-1 overflow-hidden">
              <div
                className="flex h-full"
                style={{
                  width: "300%",
                  transform: `translate3d(calc(-33.33333% + ${swipe.dx}px), 0, 0)`,
                  transition: swipe.settling
                    ? `transform ${settleMs}ms cubic-bezier(.22,.61,.36,1)`
                    : "none",
                  willChange: swiping ? "transform" : undefined,
                }}
              >
                {[-1, 0, 1].map((offset) => (
                  <DayColumn
                    key={`${singleColumn}:${offset}`}
                    column={singleColumn + offset}
                    basis="33.33333%"
                    inert={offset !== 0}
                    {...dayColProps}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div ref={columnsRef} className="flex min-w-0 flex-1">
              {columns.map((col) => (
                <DayColumn key={col} column={col} {...dayColProps} />
              ))}
            </div>
          )}
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

function DayColumn({
  column,
  hourPx,
  snap,
  hours,
  minorLines,
  columnCount,
  preview,
  beginMove,
  beginResize,
  cancelPending,
  dateForOffset,
  basis,
  inert = false,
}: {
  column: number;
  hourPx: number;
  snap: number;
  hours: number[];
  minorLines: number[];
  columnCount: number;
  preview: ReturnType<typeof useBlockGestures>["preview"];
  beginMove: ReturnType<typeof useBlockGestures>["beginMove"];
  beginResize: ReturnType<typeof useBlockGestures>["beginResize"];
  cancelPending: ReturnType<typeof useBlockGestures>["cancelPending"];
  dateForOffset: (offset: number) => string;
  /** Fixed width when used inside the pager track. */
  basis?: string;
  /** Off-screen neighbour: visible during a swipe, but not interactive. */
  inert?: boolean;
}) {
  const store = useStore();
  const dateISO = dateForOffset(column);
  const dow = new Date(dateISO + "T00:00:00").getDay();
  const isSabbath = dow === 0;

  // Select by date, not by column offset, so the pager's neighbouring days
  // render correctly even when they belong to the previous or next week.
  const dayBlocks = store.blocks.filter((b) => b.date === dateISO);
  const dayExternal = store.external.filter((e) => e.date === dateISO);

  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    function tick() {
      const n = new Date();
      const isToday = localISO(n) === dateISO;
      const mins = n.getHours() * 60 + n.getMinutes();
      setNowMin(isToday && mins >= GRID_START_MIN && mins <= GRID_END_MIN ? mins : null);
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [dateISO]);

  function handleSlotClick(e: React.MouseEvent<HTMLDivElement>) {
    if (inert || !store.armedAreaId || preview?.lifted) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = minutesFromOffsetPx(e.clientY - rect.top, hourPx);
    const { start, end } = defaultPlacement(snapMinutes(minutes, snap));
    store.place(column, start, end);
  }

  const draggedHere =
    !inert && preview?.lifted && preview.column === column
      ? store.blocks.find((b) => b.id === preview.blockId)
      : undefined;
  const visible = dayBlocks.filter(
    (b) => !(preview?.lifted && b.id === preview.blockId)
  );

  return (
    <div
      className={`relative min-w-0 border-r border-black bg-white last:border-r-0 ${
        basis ? "" : "flex-1"
      }`}
      style={{
        ...(basis ? { flex: `0 0 ${basis}` } : {}),
        // An off-screen neighbour is visible during a swipe but must not be
        // touchable, clickable, or focusable — it isn't the day you're on.
        ...(inert ? { pointerEvents: "none" as const } : {}),
      }}
      onClick={handleSlotClick}
      aria-hidden={inert || undefined}
    >
      {isSabbath && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={GREY25}
        />
      )}

      {minorLines.map((m) => (
        <div
          key={`minor-${m}`}
          aria-hidden
          className="pointer-events-none absolute left-0 right-0"
          style={{
            top: pxFromMinutes(m, hourPx),
            height: 1,
            backgroundImage:
              "repeating-linear-gradient(90deg,#000 0 1px,transparent 1px 7px)",
            opacity: 0.5,
          }}
        />
      ))}

      {hours.slice(1).map((m) => (
        <div
          key={m}
          aria-hidden
          className="pointer-events-none absolute left-0 right-0"
          style={{
            top: pxFromMinutes(m, hourPx),
            height: 1,
            backgroundImage:
              "repeating-linear-gradient(90deg,#000 0 1px,transparent 1px 4px)",
          }}
        />
      ))}

      {layoutDay(visible).map(({ block, column: col, columns: cols }) => {
        const area = store.areas.find((a) => a.id === block.area_id);
        if (!area) return null;
        return (
          <BlockView
            key={block.id}
            block={block}
            area={area}
            hourPx={hourPx}
            column={col}
            columns={cols}
            selected={!inert && store.selectedBlockId === block.id}
            tabIndex={inert ? -1 : undefined}
            onClick={() => !inert && store.select(block.id)}
            onPointerDownBlock={
              inert ? undefined : (e) => beginMove(e, block, column)
            }
            onPointerUpBlock={inert ? undefined : cancelPending}
            onResizeStart={
              inert ? undefined : (e, edge) => beginResize(e, block, column, edge)
            }
          />
        );
      })}

      {draggedHere && preview && (
        <BlockView
          block={draggedHere}
          area={store.areas.find((a) => a.id === draggedHere.area_id)!}
          hourPx={hourPx}
          selected={false}
          lifted
          overrideStartMin={preview.startMin}
          overrideEndMin={preview.endMin}
          onClick={() => {}}
        />
      )}

      {dayExternal.map((ev) => (
        <LockedEvent key={ev.gcal_event_id} ev={ev} hourPx={hourPx} />
      ))}

      {nowMin !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 z-20"
          style={{ top: pxFromMinutes(nowMin, hourPx) }}
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

function LockedEvent({ ev, hourPx }: { ev: ExternalEvent; hourPx: number }) {
  const top = pxFromHHMM(ev.start_time, hourPx);
  const height = pxFromHHMM(ev.end_time, hourPx) - top;
  return (
    <div
      className="pointer-events-none absolute left-[30%] right-[2px] z-10 overflow-hidden border border-black"
      style={{ top, height, minHeight: 12, ...GREY50 }}
      title={`${ev.title} (locked — external calendar event)`}
    >
      <span
        className="block truncate bg-white px-1 font-prose"
        style={{ fontSize: 9, lineHeight: "13px" }}
      >
        🔒 {ev.title}
      </span>
    </div>
  );
}
