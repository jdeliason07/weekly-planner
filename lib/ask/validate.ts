// Assistant action validation. Runs on the server (before returning actions)
// AND again in the store (before applying to state). Anything malformed or
// out of bounds is DROPPED, never thrown — a hostile or broken model response
// can reduce the number of applied actions but can never corrupt state.
//
// Rules enforced here:
//   - the area id must exist
//   - the day must resolve to a column 0–6
//   - times must parse and start < end
//   - the block must fall between 06:00 and 23:00
//   - for move/remove, the block id must exist

import type { Area } from "../types";
import { isValidGridRange, resolveDayColumn } from "../time";

export type RawAction = Record<string, unknown>;

export type AssistantAction =
  | {
      action: "add";
      area: string;
      column: number;
      start: string;
      end: string;
      label: string | null;
    }
  | { action: "move"; id: string; column: number; start: string; end: string }
  | { action: "remove"; id: string };

export interface ValidateCtx {
  areas: Area[];
  weekStartsOn: number;
  blockIds: Set<string>;
}

type Result =
  | { ok: true; value: AssistantAction }
  | { ok: false; reason: string };

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export function validateAction(raw: RawAction, ctx: ValidateCtx): Result {
  const action = str(raw.action);
  if (!action) return { ok: false, reason: "missing action" };

  if (action === "add") {
    const areaToken = str(raw.area);
    if (!areaToken) return { ok: false, reason: "missing area" };
    const area = resolveArea(areaToken, ctx.areas);
    if (!area) return { ok: false, reason: "unknown area" };

    const dayToken = str(raw.day);
    if (!dayToken) return { ok: false, reason: "missing day" };
    const column = resolveDayColumn(dayToken, ctx.weekStartsOn);
    if (column === null) return { ok: false, reason: "unresolved day" };

    const start = str(raw.start);
    const end = str(raw.end);
    if (!start || !end) return { ok: false, reason: "missing times" };
    if (!isValidGridRange(start, end))
      return { ok: false, reason: "times out of bounds" };

    const label = str(raw.label);
    return {
      ok: true,
      value: { action: "add", area: area.id, column, start, end, label },
    };
  }

  if (action === "move") {
    const id = str(raw.id);
    if (!id || !ctx.blockIds.has(id))
      return { ok: false, reason: "unknown block id" };

    const dayToken = str(raw.day);
    if (!dayToken) return { ok: false, reason: "missing day" };
    const column = resolveDayColumn(dayToken, ctx.weekStartsOn);
    if (column === null) return { ok: false, reason: "unresolved day" };

    const start = str(raw.start);
    const end = str(raw.end);
    if (!start || !end) return { ok: false, reason: "missing times" };
    if (!isValidGridRange(start, end))
      return { ok: false, reason: "times out of bounds" };

    return { ok: true, value: { action: "move", id, column, start, end } };
  }

  if (action === "remove") {
    const id = str(raw.id);
    if (!id || !ctx.blockIds.has(id))
      return { ok: false, reason: "unknown block id" };
    return { ok: true, value: { action: "remove", id } };
  }

  return { ok: false, reason: "unknown action type" };
}

// Match an area by id, or case-insensitively by name (the model is told to use
// ids, but be forgiving of "korvo" vs "Korvo").
function resolveArea(token: string, areas: Area[]): Area | null {
  const t = token.trim().toLowerCase();
  return (
    areas.find((a) => a.id.toLowerCase() === t) ??
    areas.find((a) => a.name.toLowerCase() === t) ??
    null
  );
}

export function validateAll(
  rawActions: unknown,
  ctx: ValidateCtx
): AssistantAction[] {
  if (!Array.isArray(rawActions)) return [];
  const out: AssistantAction[] = [];
  for (const raw of rawActions) {
    if (raw && typeof raw === "object") {
      const r = validateAction(raw as RawAction, ctx);
      if (r.ok) out.push(r.value);
    }
  }
  return out;
}
