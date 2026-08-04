"use client";

// Gestures that belong to the grid surface rather than to a block:
//
//   • pinch with two fingers → zoom the day between "whole day at a glance"
//     and 15-minute detail
//   • drag horizontally      → the day tracks your finger and settles onto the
//     next or previous day when you let go
//
// The swipe is a pager, not a jump: `dx` is the live offset the day track
// renders at, so the neighbouring day is visibly coming in under your thumb.
// Vertical scrolling stays the browser's job until the gesture commits to the
// horizontal axis, at which point we take the finger.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MIN_HOUR_PX,
  MAX_HOUR_PX,
  nearestZoomIndex,
  ZOOM_LEVELS,
} from "@/lib/grid";

const AXIS_LOCK_PX = 8; // travel before we decide horizontal vs vertical
const AXIS_RATIO = 1.2; // how much more horizontal than vertical to lock
const SETTLE_MS = 240;
const FLICK_VELOCITY = 0.45; // px/ms — a fast flick commits regardless of travel

export interface SwipeState {
  /** Live horizontal offset in px for the day track. */
  dx: number;
  /** True while animating to its resting place — the track eases, not jumps. */
  settling: boolean;
}

interface Params {
  zoomIndex: number;
  setZoomIndex: (i: number) => void;
  swipeEnabled: boolean;
  /** Commit a day change. Called after the track has slid fully across. */
  onSwipe: (dir: 1 | -1) => void;
  /** Width of one page, for thresholds and the settle distance. */
  pageWidthRef: React.RefObject<HTMLElement | null>;
  /** True while a block drag owns the finger — surface gestures stand down. */
  suspended: boolean;
}

export function useSurfaceGestures({
  zoomIndex,
  setZoomIndex,
  swipeEnabled,
  onSwipe,
  pageWidthRef,
  suspended,
}: Params) {
  const [livePinchPx, setLivePinchPx] = useState<number | null>(null);
  const [swipe, setSwipe] = useState<SwipeState>({ dx: 0, settling: false });

  const s = useRef({
    pointers: new Map<number, { x: number; y: number }>(),
    pinchStartDist: 0,
    pinchStartPx: 0,
    startX: 0,
    startY: 0,
    startT: 0,
    lastX: 0,
    lastT: 0,
    axis: null as "h" | "v" | null,
    tracking: false,
    settleTimer: 0 as unknown as ReturnType<typeof setTimeout>,
  });

  const pageWidth = useCallback(
    () => pageWidthRef.current?.getBoundingClientRect().width ?? 320,
    [pageWidthRef]
  );

  // Once the gesture commits to horizontal, stop the browser scrolling
  // vertically underneath it. Needs a non-passive listener to be allowed.
  useEffect(() => {
    const el = pageWidthRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (s.current.axis === "h") e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [pageWidthRef]);

  const settleTo = useCallback(
    (dx: number, then?: () => void) => {
      setSwipe({ dx, settling: true });
      clearTimeout(s.current.settleTimer);
      s.current.settleTimer = setTimeout(() => {
        then?.();
        // Land back at rest with no transition, so the newly-centred day
        // doesn't slide a second time.
        setSwipe({ dx: 0, settling: false });
      }, SETTLE_MS);
    },
    []
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (suspended) return;
      const st = s.current;
      st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (st.pointers.size === 1) {
        st.startX = e.clientX;
        st.startY = e.clientY;
        st.startT = performance.now();
        st.lastX = e.clientX;
        st.lastT = st.startT;
        st.axis = null;
        st.tracking = swipeEnabled;
        clearTimeout(st.settleTimer);
        setSwipe({ dx: 0, settling: false });
      } else if (st.pointers.size === 2) {
        // Two fingers: a pinch, never a swipe.
        st.tracking = false;
        st.axis = null;
        setSwipe({ dx: 0, settling: false });
        const pts = Array.from(st.pointers.values());
        st.pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        st.pinchStartPx = ZOOM_LEVELS[zoomIndex].hourPx;
        setLivePinchPx(st.pinchStartPx);
      }
    },
    [suspended, swipeEnabled, zoomIndex]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const st = s.current;
      if (!st.pointers.has(e.pointerId)) return;
      st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (st.pointers.size >= 2 && st.pinchStartDist > 0) {
        const pts = Array.from(st.pointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const next = Math.min(
          MAX_HOUR_PX,
          Math.max(MIN_HOUR_PX, st.pinchStartPx * (dist / st.pinchStartDist))
        );
        setLivePinchPx(next);
        return;
      }

      if (!st.tracking || suspended) return;

      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;

      if (st.axis === null) {
        if (Math.abs(dx) > AXIS_LOCK_PX || Math.abs(dy) > AXIS_LOCK_PX) {
          st.axis = Math.abs(dx) > Math.abs(dy) * AXIS_RATIO ? "h" : "v";
          if (st.axis === "v") st.tracking = false; // let the browser scroll
        }
        if (st.axis !== "h") return;
      }

      st.lastX = e.clientX;
      st.lastT = performance.now();

      // Rubber-band a little so the track feels attached, not rigid.
      const w = pageWidth();
      const eased =
        Math.abs(dx) > w ? Math.sign(dx) * (w + (Math.abs(dx) - w) * 0.3) : dx;
      setSwipe({ dx: eased, settling: false });
    },
    [suspended, pageWidth]
  );

  const endPointer = useCallback(
    (e: React.PointerEvent) => {
      const st = s.current;
      const wasTracking = st.tracking && st.axis === "h";
      st.pointers.delete(e.pointerId);

      if (st.pointers.size < 2 && st.pinchStartDist > 0) {
        setLivePinchPx((live) => {
          if (live != null) setZoomIndex(nearestZoomIndex(live));
          return null;
        });
        st.pinchStartDist = 0;
      }

      if (st.pointers.size === 0 && wasTracking) {
        const w = pageWidth();
        const dx = e.clientX - st.startX;
        const dt = Math.max(1, performance.now() - st.startT);
        const velocity = Math.abs(dx) / dt;
        const past = Math.abs(dx) > w * 0.25 || velocity > FLICK_VELOCITY;

        if (past && Math.abs(dx) > 12) {
          const dir: 1 | -1 = dx < 0 ? 1 : -1;
          // Slide the rest of the way, THEN swap the day underneath.
          settleTo(dir === 1 ? -w : w, () => onSwipe(dir));
        } else {
          settleTo(0); // not far enough — spring back
        }
        st.axis = null;
        st.tracking = false;
      } else if (st.pointers.size === 0) {
        st.axis = null;
        st.tracking = false;
      }
    },
    [setZoomIndex, pageWidth, settleTo, onSwipe]
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      const next = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, zoomIndex + dir));
      if (next !== zoomIndex) setZoomIndex(next);
    },
    [zoomIndex, setZoomIndex]
  );

  useEffect(() => {
    if (suspended) {
      s.current.pointers.clear();
      s.current.tracking = false;
      s.current.axis = null;
      setSwipe({ dx: 0, settling: false });
    }
  }, [suspended]);

  useEffect(() => () => clearTimeout(s.current.settleTimer), []);

  return {
    livePinchPx,
    swipe,
    settleMs: SETTLE_MS,
    surfaceHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onWheel,
    },
  };
}
