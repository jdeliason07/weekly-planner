// The budget meter math. This is the reason the app exists.
//
//   168 hrs  −  sleep  −  locked external events  =  available
//   available  −  allocated  =  remaining
//
// Every figure here is derived, never stored, so it can never drift from the
// blocks actually on the grid.

import type { Area, PlannedBlock, ExternalEvent } from "./types";
import { durationHours } from "./time";

const HOURS_IN_WEEK = 168;

export interface AreaAllocation {
  area: Area;
  targetHours: number;
  placedHours: number; // all placed blocks for this area (incl. open)
}

export interface Budget {
  hoursInWeek: number;
  sleepHours: number;
  lockedExternalHours: number;
  availableHours: number; // 168 − sleep − locked
  allocatedHours: number; // sum of all placed blocks
  remainingHours: number; // available − allocated (may be negative)
  isOver: boolean;
  overBy: number; // 0 when not over
  targetsSumHours: number; // all area targets summed — the feasibility marker
  perArea: AreaAllocation[];
}

export function computeBudget(
  areas: Area[],
  blocks: PlannedBlock[],
  externalEvents: ExternalEvent[],
  sleepHoursPerNight: number
): Budget {
  const sleepHours = sleepHoursPerNight * 7;

  // Locked external events are only the ones NOT created by this app — those
  // are real commitments the app must plan around. App-owned events already
  // correspond to placed blocks, so counting them would double-count.
  const lockedExternalHours = externalEvents
    .filter((e) => !e.ownedByApp)
    .reduce((sum, e) => sum + durationHours(e.start_time, e.end_time), 0);

  const availableHours = HOURS_IN_WEEK - sleepHours - lockedExternalHours;

  const placedByArea = new Map<string, number>();
  for (const b of blocks) {
    const h = durationHours(b.start_time, b.end_time);
    placedByArea.set(b.area_id, (placedByArea.get(b.area_id) ?? 0) + h);
  }

  const allocatedHours = Array.from(placedByArea.values()).reduce(
    (a, b) => a + b,
    0
  );

  const remainingHours = availableHours - allocatedHours;
  const isOver = remainingHours < 0;

  const perArea: AreaAllocation[] = areas
    .filter((a) => !a.archived_at)
    .sort((a, b) => a.rank - b.rank)
    .map((area) => ({
      area,
      targetHours: area.target_hours_per_week,
      placedHours: placedByArea.get(area.id) ?? 0,
    }));

  const targetsSumHours = perArea.reduce((s, a) => s + a.targetHours, 0);

  return {
    hoursInWeek: HOURS_IN_WEEK,
    sleepHours,
    lockedExternalHours,
    availableHours,
    allocatedHours,
    remainingHours,
    isOver,
    overBy: isOver ? -remainingHours : 0,
    targetsSumHours,
    perArea,
  };
}

export function fmtHours(h: number): string {
  // Trim trailing .0 but keep .5 etc.
  const rounded = Math.round(h * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
