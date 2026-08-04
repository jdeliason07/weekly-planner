"use client";

// Touch/pointer gestures for blocks on the grid:
//
//   • long-press a block  → it lifts, then follows your finger up and down
//   • drag near an edge   → after a short dwell, the grid moves to the next day
//                           and the block comes with it
//   • drag a corner dot   → resize from the top (start) or bottom (end)
//
// Everything is previewed in local state and committed once on release, so a
// drag never spams the store — and abandoning a drag changes nothing.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampToGrid,
  minutesFromDeltaPx,
  snapMinutes,
} from "@/lib/grid";
import { GRID_START_MIN, GRID_END_MIN, toMinutes } from "@/lib/time";

const LONG_PRESS_MS = 300;
const MOVE_CANCEL_PX = 10; // finger travel that means "scroll", not "hold"
const EDGE_PX = 44; // edge band that triggers a day change
const EDGE_DWELL_MS = 420;
const MIN_DURATION = 15;

export type DragMode = "move" | "resize-start" | "resize-end";

export interface DragPreview {
  blockId: string;
  mode: DragMode;
  startMin: number;
  endMin: number;
  /** Column the block would land in (only meaningful in 7-column view). */
  column: number;
  /** Set once the long-press threshold is crossed. */
  lifted: boolean;
  /** "prev" | "next" while hovering an edge, for the day-change hint. */
  edge: "prev" | "next" | null;
}

interface Params {
  hourPx: number;
  snap: number;
  /** Number of day columns on screen (1 on mobile, 7 on desktop). */
  columnCount: number;
  /** Geometry source for column hit-testing. */
  columnsRef: React.RefObject<HTMLElement | null>;
  onCommit: (
    blockId: string,
    change: { startMin: number; endMin: number; columnDelta: number }
  ) => void;
  /** Single-day view only: step the visible day by ±1. */
  onDayStep: (dir: 1 | -1) => boolean;
}

export function useBlockGestures({
  hourPx,
  snap,
  columnCount,
  columnsRef,
  onCommit,
  onDayStep,
}: Params) {
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const previewRef = useRef<DragPreview | null>(null);
  previewRef.current = preview;

  // Mutable gesture bookkeeping — refs so listeners never go stale.
  const g = useRef({
    active: false,
    pointerId: -1,
    mode: "move" as DragMode,
    blockId: "",
    startClientX: 0,
    startClientY: 0,
    originStart: 0,
    originEnd: 0,
    originColumn: 0,
    columnDelta: 0,
    longPressTimer: 0 as unknown as ReturnType<typeof setTimeout>,
    edgeTimer: 0 as unknown as ReturnType<typeof setInterval>,
    edgeSince: 0,
    edgeDir: null as "prev" | "next" | null,
    cancelled: false,
  });

  const clearTimers = useCallback(() => {
    clearTimeout(g.current.longPressTimer);
    clearInterval(g.current.edgeTimer);
  }, []);

  const endGesture = useCallback(() => {
    clearTimers();
    g.current.active = false;
    g.current.pointerId = -1;
    g.current.edgeDir = null;
    setPreview(null);
  }, [clearTimers]);

  // While lifted, block the browser's own scrolling so the drag owns the finger.
  useEffect(() => {
    if (!preview?.lifted) return;
    const stop = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", stop, { passive: false });
    return () => document.removeEventListener("touchmove", stop);
  }, [preview?.lifted]);

  const applyPointer = useCallback(
    (clientX: number, clientY: number) => {
      const s = g.current;
      if (!s.active) return;

      const dy = clientY - s.startClientY;
      const rawDelta = minutesFromDeltaPx(dy, hourPx);
      const delta = snapMinutes(rawDelta, snap);

      let startMin = s.originStart;
      let endMin = s.originEnd;

      if (s.mode === "move") {
        const duration = s.originEnd - s.originStart;
        startMin = clampToGrid(s.originStart + delta);
        // Keep the whole block on the grid rather than letting it clip.
        if (startMin + duration > GRID_END_MIN) {
          startMin = GRID_END_MIN - duration;
        }
        startMin = Math.max(GRID_START_MIN, startMin);
        endMin = startMin + duration;
      } else if (s.mode === "resize-start") {
        startMin = clampToGrid(s.originStart + delta);
        startMin = Math.min(startMin, s.originEnd - MIN_DURATION);
      } else {
        endMin = clampToGrid(s.originEnd + delta);
        endMin = Math.max(endMin, s.originStart + MIN_DURATION);
      }

      // Horizontal: which day does this land on?
      let column = s.originColumn + s.columnDelta;
      let edge: "prev" | "next" | null = null;
      const rect = columnsRef.current?.getBoundingClientRect();

      if (s.mode === "move" && rect) {
        if (columnCount > 1) {
          // Multi-column view: map x straight onto a column.
          const w = rect.width / columnCount;
          const idx = Math.floor((clientX - rect.left) / w);
          column = Math.min(columnCount - 1, Math.max(0, idx));
          s.columnDelta = column - s.originColumn;
        } else {
          // Single-day view: hovering an edge steps the day after a dwell.
          if (clientX < rect.left + EDGE_PX) edge = "prev";
          else if (clientX > rect.right - EDGE_PX) edge = "next";

          if (edge !== s.edgeDir) {
            s.edgeDir = edge;
            s.edgeSince = Date.now();
            clearInterval(s.edgeTimer);
            if (edge) {
              s.edgeTimer = setInterval(() => {
                if (!g.current.active || g.current.edgeDir !== edge) return;
                if (Date.now() - g.current.edgeSince < EDGE_DWELL_MS) return;
                const moved = onDayStep(edge === "next" ? 1 : -1);
                if (moved) {
                  g.current.columnDelta += edge === "next" ? 1 : -1;
                  g.current.edgeSince = Date.now();
                }
              }, 120);
            }
          }
        }
      }

      const next: DragPreview = {
        blockId: s.blockId,
        mode: s.mode,
        startMin,
        endMin,
        column,
        lifted: true,
        edge,
      };
      previewRef.current = next;
      setPreview(next);
    },
    [hourPx, snap, columnCount, columnsRef, onDayStep]
  );

  // Global listeners — a drag must survive the finger leaving the block.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const s = g.current;
      if (s.pointerId !== e.pointerId) return;

      if (!s.active) {
        // Before the long-press fires, enough travel means the user is
        // scrolling or swiping — let the browser have it.
        const dx = Math.abs(e.clientX - s.startClientX);
        const dy = Math.abs(e.clientY - s.startClientY);
        if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
          s.cancelled = true;
          clearTimeout(s.longPressTimer);
        }
        return;
      }
      applyPointer(e.clientX, e.clientY);
    }

    function onUp(e: PointerEvent) {
      const s = g.current;
      if (s.pointerId !== e.pointerId) return;
      const p = previewRef.current;
      if (s.active && p) {
        onCommit(s.blockId, {
          startMin: p.startMin,
          endMin: p.endMin,
          columnDelta: s.columnDelta,
        });
      }
      clearTimeout(s.longPressTimer);
      endGesture();
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [applyPointer, onCommit, endGesture]);

  useEffect(() => clearTimers, [clearTimers]);

  /** Attach to a block: long-press lifts it, a quick tap stays a tap. */
  const beginMove = useCallback(
    (
      e: React.PointerEvent,
      block: { id: string; start_time: string; end_time: string },
      column: number
    ) => {
      if (e.button != null && e.button !== 0) return;
      const s = g.current;
      clearTimers();
      s.active = false;
      s.cancelled = false;
      s.pointerId = e.pointerId;
      s.mode = "move";
      s.blockId = block.id;
      s.startClientX = e.clientX;
      s.startClientY = e.clientY;
      s.originStart = toMinutes(block.start_time);
      s.originEnd = toMinutes(block.end_time);
      s.originColumn = column;
      s.columnDelta = 0;
      s.edgeDir = null;

      s.longPressTimer = setTimeout(() => {
        if (s.cancelled) return;
        s.active = true;
        // Haptic nudge where supported — the lift should be felt.
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate?.(12);
          } catch {
            /* not supported — visual lift is enough */
          }
        }
        const p: DragPreview = {
          blockId: block.id,
          mode: "move",
          startMin: s.originStart,
          endMin: s.originEnd,
          column,
          lifted: true,
          edge: null,
        };
        previewRef.current = p;
        setPreview(p);
      }, LONG_PRESS_MS);
    },
    [clearTimers]
  );

  /** Attach to a corner dot: resizing starts immediately, no long-press. */
  const beginResize = useCallback(
    (
      e: React.PointerEvent,
      block: { id: string; start_time: string; end_time: string },
      column: number,
      edge: "start" | "end"
    ) => {
      e.stopPropagation();
      e.preventDefault();
      const s = g.current;
      clearTimers();
      s.active = true;
      s.cancelled = false;
      s.pointerId = e.pointerId;
      s.mode = edge === "start" ? "resize-start" : "resize-end";
      s.blockId = block.id;
      s.startClientX = e.clientX;
      s.startClientY = e.clientY;
      s.originStart = toMinutes(block.start_time);
      s.originEnd = toMinutes(block.end_time);
      s.originColumn = column;
      s.columnDelta = 0;
      s.edgeDir = null;

      const p: DragPreview = {
        blockId: block.id,
        mode: s.mode,
        startMin: s.originStart,
        endMin: s.originEnd,
        column,
        lifted: true,
        edge: null,
      };
      previewRef.current = p;
      setPreview(p);
    },
    [clearTimers]
  );

  /** A tap that never became a long-press. */
  const cancelPending = useCallback(() => {
    if (!g.current.active) clearTimeout(g.current.longPressTimer);
  }, []);

  return { preview, beginMove, beginResize, cancelPending };
}
