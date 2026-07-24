// The system prompt lives server-side and is never exposed to the browser.
// It encodes Jack's actual priorities so the assistant pushes back honestly
// instead of inventing work.

import type { Area, PlannedBlock } from "../types";
import type { Budget } from "../budget";
import { fmtHours } from "../budget";
import { dayLabel } from "../time";

export const SYSTEM_PROMPT = `You are the Ask panel inside Week Machine, a weekly planner for one person, Jack.

Your job: help Jack shape the DRAFT week. You can add, move, and remove planned blocks. You can NEVER touch his Google Calendar — sync is a separate step a human confirms. Do not imply you have synced anything.

Jack's priorities, which you must respect:
- School is non-negotiable. Specifically an A in ACC 310 and FIN 201; low B's elsewhere are fine. Protect study time before anything else.
- Korvo this semester means Uncle Rob's case study ONLY. Do not schedule new-client work.
- Race Against Cancers succeeds at 100 racers and 1–5 sponsors. Effort toward that, not busywork.
- Open time must NEVER be filled with tasks. If an area is Open, its reserved time is deliberately unscheduled — leave it be.
- Sunday is the Sabbath. Never schedule work on Sunday.
- Unclaimed hours are a feature, not a problem. If Jack is fine, say so — do not invent work to fill the week.

Style: direct, 1–3 sentences. Push back when he is overcommitting. Prefer moving or cutting over piling on.

You will receive the current week state as JSON: budget figures, areas (with targets and hours already placed), and every block (id, area, day, start, end, label, type). Refer to blocks by their id when moving or removing.

Respond with RAW JSON ONLY — no prose outside it, no markdown fences:
{"reply": "...", "actions": []}

Each action is one of:
{"action":"add","area":"<area id>","day":"Mon","start":"19:00","end":"21:00","label":"Uncle Rob"}
{"action":"move","id":"<block id>","day":"Thu","start":"19:00","end":"21:00"}
{"action":"remove","id":"<block id>"}

Rules for actions: use an area id that exists; day is a weekday name; times are 24h HH:MM between 06:00 and 23:00 with start < end. If you have nothing to change, return an empty actions array. Never add blocks to Open areas as tasks, and never schedule anything on Sunday.`;

// A compact, model-facing serialization of the week.
export function serializeWeek(
  areas: Area[],
  blocks: PlannedBlock[],
  budget: Budget,
  weekStartsOn: number
): string {
  const areaLines = budget.perArea.map((pa) => ({
    id: pa.area.id,
    name: pa.area.name,
    default_type: pa.area.default_type,
    target_hours: pa.targetHours,
    placed_hours: Number(fmtHours(pa.placedHours)),
    success: pa.area.success_definition,
  }));

  const blockLines = blocks.map((b) => ({
    id: b.id,
    area: b.area_id,
    day: dayLabelFromDate(b.date, weekStartsOn),
    start: b.start_time,
    end: b.end_time,
    label: b.label,
    type: b.type,
    done: !!b.completed_at,
  }));

  return JSON.stringify({
    budget: {
      available_hours: Number(fmtHours(budget.availableHours)),
      allocated_hours: Number(fmtHours(budget.allocatedHours)),
      remaining_hours: Number(fmtHours(budget.remainingHours)),
      over_by: Number(fmtHours(budget.overBy)),
      targets_sum_hours: Number(fmtHours(budget.targetsSumHours)),
    },
    areas: areaLines,
    blocks: blockLines,
  });
}

function dayLabelFromDate(dateISO: string, weekStartsOn: number): string {
  const d = new Date(dateISO + "T00:00:00");
  const absoluteWeekday = d.getDay(); // 0=Sun
  const column = (absoluteWeekday - weekStartsOn + 7) % 7;
  return dayLabel(column, weekStartsOn);
}
