// Overlap layout. Two blocks at the same time would otherwise stack on top of
// each other and hide one entirely. This splits any set of mutually
// overlapping blocks into side-by-side columns, the way a calendar does.

import type { PlannedBlock } from "./types";
import { toMinutes } from "./time";

export interface PlacedLayout {
  block: PlannedBlock;
  /** 0-based column within its overlap cluster. */
  column: number;
  /** How many columns that cluster needs. */
  columns: number;
}

export function layoutDay(blocks: PlannedBlock[]): PlacedLayout[] {
  const sorted = [...blocks].sort((a, b) => {
    const d = toMinutes(a.start_time) - toMinutes(b.start_time);
    if (d !== 0) return d;
    // Longer blocks first so they take the left column and read as the base.
    return (
      toMinutes(b.end_time) -
      toMinutes(b.start_time) -
      (toMinutes(a.end_time) - toMinutes(a.start_time))
    );
  });

  const out: PlacedLayout[] = [];
  let cluster: PlannedBlock[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    // Greedy column assignment: reuse the first column whose last block has
    // already ended.
    const colEnds: number[] = [];
    const assigned = cluster.map((b) => {
      const start = toMinutes(b.start_time);
      let col = colEnds.findIndex((end) => end <= start);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(0);
      }
      colEnds[col] = toMinutes(b.end_time);
      return { block: b, column: col };
    });
    const columns = colEnds.length;
    for (const a of assigned) out.push({ ...a, columns });
    cluster = [];
    clusterEnd = -1;
  };

  for (const b of sorted) {
    const start = toMinutes(b.start_time);
    if (cluster.length > 0 && start >= clusterEnd) flush();
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, toMinutes(b.end_time));
  }
  flush();

  return out;
}
