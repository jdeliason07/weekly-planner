"use client";

// Gestures that belong to the grid surface rather than to a block:
//
//   • pinch with two fingers → zoom the day between "whole day at a glance"
//     and 15-minute detail
//   • swipe left/right       → move to the next or previous day
//
// Vertical scrolling stays the browser's job (touch-action: pan-y), so the
// grid still scrolls normally when you aren't doing either of these.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MIN_HOUR_PX,
  MAX_HOUR_PX,
  nearestZoomIndex,
  ZOOM_LEVELS,
} from "@/lib/grid";

const SWIPE_MIN_PX = 56; // horizontal travel that counts as a swipe
const SWIPE_AXIS_RATIO = 1.6; // how much more horizontal than vertical

interface Params {
  /** Live zoom stop index, and how to change it. */
  zoomIndex: number;
  setZoomIndex: (i: number) => void;
  /** Swiping is only meaningful in the single-day view. */
  swipeEnabled: boolean;
  onSwipe: (dir: 1 | -1) => void;
  /** True while a block drag owns the finger — surface gestures stand down. */
  suspended: boolean;
}

export function useSurfaceGestures({
  zoomIndex,
  setZoomIndex,
  swipeEnabled,
  onSwipe,
  suspended,
}: Params) {
  // Continuous scale during a pinch; null when not pinching. Rendering reads
  // this so the zoom tracks the fingers, then snaps to a stop on release.
  const [livePinchPx, setLivePinchPx] = useState<number | null>(null);

  const s = useRef({
    pointers: new Map<number, { x: number; y: number }>(),
    pinchStartDist: 0,
    pinchStartPx: 0,
    swipeStartX: 0,
    swipeStartY: 0,
    swipeCandidate: false,
    swipeFired: false,
  });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (suspended) return;
      const st = s.current;
      st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (st.pointers.size === 1) {
        st.swipeStartX = e.clientX;
        st.swipeStartY = e.clientY;
        st.swipeCandidate = swipeEnabled;
        st.swipeFired = false;
      } else if (st.pointers.size === 2) {
        // Two fingers down — this is a pinch, not a swipe.
        st.swipeCandidate = false;
        const pts = Array.from(st.pointers.values());
        st.pinchStartDist = Math.hypot(
          pts[0].x - pts[1].x,
          pts[0].y - pts[1].y
        );
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
        const scale = dist / st.pinchStartDist;
        const next = Math.min(
          MAX_HOUR_PX,
          Math.max(MIN_HOUR_PX, st.pinchStartPx * scale)
        );
        setLivePinchPx(next);
        return;
      }

      if (st.swipeCandidate && !st.swipeFired && !suspended) {
        const dx = e.clientX - st.swipeStartX;
        const dy = e.clientY - st.swipeStartY;
        if (
          Math.abs(dx) > SWIPE_MIN_PX &&
          Math.abs(dx) > Math.abs(dy) * SWIPE_AXIS_RATIO
        ) {
          st.swipeFired = true;
          // Swiping left moves forward in time, like turning a page.
          onSwipe(dx < 0 ? 1 : -1);
        }
      }
    },
    [onSwipe, suspended]
  );

  const endPointer = useCallback(
    (e: React.PointerEvent) => {
      const st = s.current;
      st.pointers.delete(e.pointerId);

      if (st.pointers.size < 2 && st.pinchStartDist > 0) {
        // Pinch finished — settle on the nearest zoom stop.
        setLivePinchPx((live) => {
          if (live != null) setZoomIndex(nearestZoomIndex(live));
          return null;
        });
        st.pinchStartDist = 0;
      }
      if (st.pointers.size === 0) {
        st.swipeCandidate = false;
        st.swipeFired = false;
      }
    },
    [setZoomIndex]
  );

  // A trackpad/mouse wheel with ctrl (or ⌘) is the desktop pinch.
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      const next = Math.min(
        ZOOM_LEVELS.length - 1,
        Math.max(0, zoomIndex + dir)
      );
      if (next !== zoomIndex) setZoomIndex(next);
    },
    [zoomIndex, setZoomIndex]
  );

  useEffect(() => {
    if (suspended) {
      s.current.pointers.clear();
      s.current.swipeCandidate = false;
    }
  }, [suspended]);

  return {
    livePinchPx,
    surfaceHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onWheel,
    },
  };
}
