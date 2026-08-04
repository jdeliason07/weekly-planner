// Grid metrics. The day grid renders at a FIXED scale — a real height per
// hour — and scrolls, instead of cramming 17 hours into whatever space is
// left. This is what makes blocks readable and tappable, especially on a
// phone.

import { GRID_START_MIN, GRID_END_MIN, toMinutes } from "./time";

export const HOUR_PX = 48;

export const GRID_HEIGHT_PX =
  ((GRID_END_MIN - GRID_START_MIN) / 60) * HOUR_PX;

export function pxFromHHMM(hhmm: string): number {
  return ((toMinutes(hhmm) - GRID_START_MIN) / 60) * HOUR_PX;
}

export function pxFromMinutes(minutes: number): number {
  return ((minutes - GRID_START_MIN) / 60) * HOUR_PX;
}

export function minutesFromOffsetPx(px: number): number {
  return GRID_START_MIN + (px / HOUR_PX) * 60;
}
