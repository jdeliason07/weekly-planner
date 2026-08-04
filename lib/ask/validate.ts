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

import type { Area, ExternalEvent } from "../types";
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
  | { action: "remove"; id: string }
  // Deletes an event that lives on Google Calendar and was NOT created by
  // this app. Only reachable when the phrase resolves to exactly ONE event —
  // see lib/calendar/ownership.authorizeUserRequestedDeletion.
  | { action: "cancel_event"; gcalEventId: string; title: string };

export interface ValidateCtx {
  areas: Area[];
  weekStartsOn: number;
  blockIds: Set<string>;
  /** Outside calendar events visible this week, for cancel_event. */
  externalEvents?: ExternalEvent[];
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

  if (action === "cancel_event") {
    const id = str(raw.id) ?? str(raw.gcalEventId);
    if (!id) return { ok: false, reason: "missing event id" };
    const events = ctx.externalEvents ?? [];
    // The id must name a real, currently-visible outside event. A model
    // cannot invent an id and have it deleted.
    const matches = events.filter((e) => e.gcal_event_id === id);
    if (matches.length !== 1) {
      return { ok: false, reason: "event id did not resolve to exactly one event" };
    }
    const ev = matches[0];
    // Events this app created are NOT cancelled through this path — they are
    // removed by deleting their block, which goes through the ordinary
    // ownership-checked sync.
    if (ev.ownedByApp) {
      return { ok: false, reason: "app-owned event: remove its block instead" };
    }
    return {
      ok: true,
      value: { action: "cancel_event", gcalEventId: id, title: ev.title },
    };
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
  let externalCancels = 0;
  for (const raw of rawActions) {
    if (!raw || typeof raw !== "object") continue;
    const r = validateAction(raw as RawAction, ctx);
    if (!r.ok) continue;
    if (r.value.action === "cancel_event") {
      // Hard cap: one outside-event deletion per reply, ever. This is what
      // makes a bulk wipe impossible no matter what the model returns.
      externalCancels += 1;
      if (externalCancels > 1) continue;
    }
    out.push(r.value);
  }
  return out;
}
