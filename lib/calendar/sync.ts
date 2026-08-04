// The sync module. Every calendar write in the app goes through here.
//
// Guarantees enforced structurally:
//   1. Open blocks never sync. Ever.
//   2. The app only ever updates/deletes events it created (via assertOwned).
//   3. Sync is two steps: a dry-run diff, then a human-confirmed commit.
//   4. Anchor/Sprint blocks are written as recurring events with an explicit
//      UNTIL and an explicit IANA timezone on every write.
//
// This file computes the diff and describes the writes. The actual Google API
// transport lives in lib/google/calendar-client.ts behind the CalendarClient
// interface, so this policy code is testable without network and can never be
// smuggled past. The Ask panel has no access to any of this.

import type { PlannedBlock, Area, ExternalEvent } from "../types";
import {
  assertOwned,
  isOwnedByApp,
  ownershipTag,
  OWNED_EVENTS_QUERY,
  type GCalEvent,
} from "./ownership";
import { effectiveType } from "../types";

export interface DiffLine {
  kind: "new" | "moved" | "expired" | "cancelled";
  blockId: string;
  label: string;
}

export interface SyncDiff {
  created: DiffLine[];
  moved: DiffLine[];
  expired: DiffLine[]; // Sprint blocks past their season end
  cancelled: DiffLine[]; // blocks removed from the plan — their event goes too
  untouchedCount: number; // existing calendar events left alone — the blast-radius reassurance
}

// A block is syncable only when its effective type is anchor or sprint.
// Open blocks are filtered out here and nowhere gets to override that.
export function isSyncable(block: PlannedBlock, area: Area): boolean {
  return effectiveType(block, area) !== "open";
}

export function isExpiredSprint(
  block: PlannedBlock,
  area: Area,
  today: string
): boolean {
  if (effectiveType(block, area) !== "sprint") return false;
  const end = area.season_end_date;
  return !!end && block.date > end;
}

// Compute the dry-run diff without writing anything. `existingOwned` is the
// set of events this app previously created (fetched with OWNED_EVENTS_QUERY);
// `allExternal` is every event in the visible week (for the untouched count).
export function computeDiff(
  blocks: PlannedBlock[],
  areas: Area[],
  existingOwned: GCalEvent[],
  allExternal: ExternalEvent[],
  today: string
): SyncDiff {
  const areaById = new Map(areas.map((a) => [a.id, a] as const));
  const ownedByBlockId = new Map<string, GCalEvent>();
  for (const ev of existingOwned) {
    const bid = ev.extendedProperties?.private?.plannerBlockId;
    if (bid) ownedByBlockId.set(bid, ev);
  }

  const created: DiffLine[] = [];
  const moved: DiffLine[] = [];
  const expired: DiffLine[] = [];

  for (const block of blocks) {
    const area = areaById.get(block.area_id);
    if (!area) continue;

    if (isExpiredSprint(block, area, today)) {
      // A prior event exists but the season has ended — schedule for removal.
      if (ownedByBlockId.has(block.id)) {
        expired.push({
          kind: "expired",
          blockId: block.id,
          label: block.label ?? area.name,
        });
      }
      continue;
    }

    if (!isSyncable(block, area)) continue; // Open — never syncs.

    const existing = ownedByBlockId.get(block.id);
    if (!existing) {
      created.push({
        kind: "new",
        blockId: block.id,
        label: block.label ?? area.name,
      });
    } else if (block.sync_state === "unsynced") {
      moved.push({
        kind: "moved",
        blockId: block.id,
        label: block.label ?? area.name,
      });
    }
  }

  // Cancelled: events this app created whose block is no longer in the plan.
  // Without this, deleting a block would orphan its calendar event forever.
  // These are all app-owned, so removing them stays inside the ownership rule.
  const liveBlockIds = new Set(blocks.map((b) => b.id));
  const cancelled: DiffLine[] = [];
  for (const ev of existingOwned) {
    // isOwnedByApp, not just "has a plannerBlockId" — an event carrying a
    // partial or forged tag is NOT ours and must never be listed for deletion.
    if (!isOwnedByApp(ev)) continue;
    const bid = ev.extendedProperties?.private?.plannerBlockId;
    if (bid && !liveBlockIds.has(bid)) {
      cancelled.push({
        kind: "cancelled",
        blockId: bid,
        label: ev.summary ?? "Planned block",
      });
    }
  }

  // Untouched: external events that are NOT owned by the app. These are never
  // written. Showing the count bounds the blast radius.
  const untouchedCount = allExternal.filter((e) => !e.ownedByApp).length;

  return { created, moved, expired, cancelled, untouchedCount };
}

// A description of a single write the commit step will perform. Includes the
// explicit timezone and recurrence — no silent defaults.
export interface WriteOp {
  op: "insert" | "update" | "delete";
  blockId: string;
  gcalEventId?: string; // required for update/delete
  event?: {
    summary: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    recurrence?: string[]; // e.g. ["RRULE:FREQ=WEEKLY;UNTIL=..."]
    extendedProperties: { private: Record<string, string> };
  };
}

export interface CalendarClient {
  // Lists events the app created, using OWNED_EVENTS_QUERY.
  listOwned(timeMin: string, timeMax: string): Promise<GCalEvent[]>;
  // Lists every event in the window (for locked rendering + untouched count).
  listAll(timeMin: string, timeMax: string): Promise<GCalEvent[]>;
  insert(op: WriteOp): Promise<string>; // returns new event id
  update(op: WriteOp): Promise<void>;
  delete(gcalEventId: string): Promise<void>;
}

// Build the write ops for a confirmed sync. Pure — no I/O. The recurrence
// rule and timezone are baked in here so every write carries them.
export function buildWriteOps(
  blocks: PlannedBlock[],
  areas: Area[],
  existingOwned: GCalEvent[],
  timezone: string,
  today: string
): WriteOp[] {
  const areaById = new Map(areas.map((a) => [a.id, a] as const));
  const ownedByBlockId = new Map<string, GCalEvent>();
  for (const ev of existingOwned) {
    const bid = ev.extendedProperties?.private?.plannerBlockId;
    if (bid) ownedByBlockId.set(bid, ev);
  }

  const ops: WriteOp[] = [];

  for (const block of blocks) {
    const area = areaById.get(block.area_id);
    if (!area) continue;
    const type = effectiveType(block, area);

    // Open never syncs.
    if (type === "open") continue;

    const existing = ownedByBlockId.get(block.id);

    if (isExpiredSprint(block, area, today)) {
      if (existing) {
        // assertOwned guarantees we only ever delete our own events.
        ops.push({ op: "delete", blockId: block.id, gcalEventId: assertOwned(existing) });
      }
      continue;
    }

    const event = {
      summary: block.label ?? area.name,
      start: {
        dateTime: `${block.date}T${block.start_time}:00`,
        timeZone: timezone,
      },
      end: {
        dateTime: `${block.date}T${block.end_time}:00`,
        timeZone: timezone,
      },
      recurrence: recurrenceFor(type, area.season_end_date, timezone),
      extendedProperties: ownershipTag(block.id),
    };

    if (!existing) {
      ops.push({ op: "insert", blockId: block.id, event });
    } else {
      // Re-assert ownership on the existing event before allowing an update.
      ops.push({
        op: "update",
        blockId: block.id,
        gcalEventId: assertOwned(existing),
        event,
      });
    }
  }

  // Delete events whose block is gone from the plan. assertOwned still gates
  // every one of these — an untagged event can never reach this path.
  const liveBlockIds = new Set(blocks.map((b) => b.id));
  for (const ev of existingOwned) {
    // Skip anything not ours BEFORE assertOwned, so a stray untagged event in
    // the input can't abort the whole sync. assertOwned still gates the write.
    if (!isOwnedByApp(ev)) continue;
    const bid = ev.extendedProperties?.private?.plannerBlockId;
    if (bid && !liveBlockIds.has(bid)) {
      ops.push({ op: "delete", blockId: bid, gcalEventId: assertOwned(ev) });
    }
  }

  return ops;
}

// Anchor → weekly, no end (or a far horizon). Sprint → weekly UNTIL season end.
// Prefer server-side recurrence over hundreds of individual events.
function recurrenceFor(
  type: "anchor" | "sprint",
  seasonEnd: string | null,
  _timezone: string
): string[] | undefined {
  if (type === "sprint" && seasonEnd) {
    // UNTIL is a UTC timestamp per RFC 5545. Use end-of-day on the season end.
    const until = seasonEnd.replace(/-/g, "") + "T235900Z";
    return [`RRULE:FREQ=WEEKLY;UNTIL=${until}`];
  }
  if (type === "anchor") {
    return ["RRULE:FREQ=WEEKLY"];
  }
  return undefined;
}

// Re-exported so callers use the same query constant.
export { OWNED_EVENTS_QUERY, isOwnedByApp };
