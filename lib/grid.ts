// Grid metrics. The day grid renders at a variable scale — pixels per hour —
// so it can zoom from "whole day at a glance" down to 15-minute detail.
// Everything positional is derived from `hourPx`, never hard-coded.

import { GRID_START_MIN, GRID_END_MIN, toMinutes } from "./time";

export const GRID_MINUTES = GRID_END_MIN - GRID_START_MIN;

// Zoom stops, coarse to fine. `snap` is the increment dragging snaps to at
// that zoom — fine control only where the pixels can actually show it.
export interface ZoomLevel {
  hourPx: number;
  snap: number; // minutes
  label: string;
  /** Minor gridline spacing in minutes, or null for hour lines only. */
  minor: number | null;
}

export const ZOOM_LEVELS: ZoomLevel[] = [
  { hourPx: 26, snap: 30, label: "DAY", minor: null },
  { hourPx: 48, snap: 15, label: "1H", minor: 30 },
  { hourPx: 96, snap: 15, label: "30M", minor: 15 },
  { hourPx: 168, snap: 5, label: "15M", minor: 15 },
];

export const DEFAULT_ZOOM = 1;

export const MIN_HOUR_PX = ZOOM_LEVELS[0].hourPx;
export const MAX_HOUR_PX = ZOOM_LEVELS[ZOOM_LEVELS.length - 1].hourPx;

// The zoom stop closest to an arbitrary hourPx (used after a pinch).
export function nearestZoomIndex(hourPx: number): number {
  let best = 0;
  let bestDist = Infinity;
  ZOOM_LEVELS.forEach((z, i) => {
    const d = Math.abs(z.hourPx - hourPx);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

export function gridHeightPx(hourPx: number): number {
  return (GRID_MINUTES / 60) * hourPx;
}

export function pxFromMinutes(minutes: number, hourPx: number): number {
  return ((minutes - GRID_START_MIN) / 60) * hourPx;
}

export function pxFromHHMM(hhmm: string, hourPx: number): number {
  return pxFromMinutes(toMinutes(hhmm), hourPx);
}

export function minutesFromOffsetPx(px: number, hourPx: number): number {
  return GRID_START_MIN + (px / hourPx) * 60;
}

/** Convert a pixel delta straight to a minute delta (no origin offset). */
export function minutesFromDeltaPx(dy: number, hourPx: number): number {
  return (dy / hourPx) * 60;
}

export function snapMinutes(minutes: number, snap: number): number {
  return Math.round(minutes / snap) * snap;
}

export function clampToGrid(minutes: number): number {
  return Math.min(Math.max(minutes, GRID_START_MIN), GRID_END_MIN);
}
