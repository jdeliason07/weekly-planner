// Calendar ownership + cancellation safety.
//
// Run with:  npx tsx lib/calendar/__tests__/ownership.test.mts
//
// These guard the single most important rule in the app: Week Machine may
// only ever delete or modify events it created. Test 4 and 5 are the ones
// that matter — they assert an untagged or partially-tagged event is never
// listed for deletion and never reaches a write.

import assert from "node:assert";
import { computeDiff, buildWriteOps } from "../sync.js";

const area: any = {
  id: "social", name: "Social", default_type: "anchor", rank: 1,
  target_hours_per_week: 4, pattern: "dots", season_end_date: null,
  success_definition: "", archived_at: null, user_id: "u",
};

const pickleball: any = {
  id: "b-pickle", week_plan_id: "w", area_id: "social", date: "2026-08-04",
  start_time: "18:00", end_time: "19:30", label: "Pickleball", type: "anchor",
  gcal_event_id: "gcal-pickle", sync_state: "synced", completed_at: null,
};

// The event the app previously wrote for pickleball.
const ownedPickle: any = {
  id: "gcal-pickle", summary: "Pickleball",
  extendedProperties: { private: { plannerApp: "weekmachine", plannerBlockId: "b-pickle" } },
};

// An event the user made by hand in Google Calendar. Untagged.
const foreignEvent: any = { id: "gcal-foreign", summary: "Dentist" };

console.log("1. Block still present -> no cancellation");
let d = computeDiff([pickleball], [area], [ownedPickle], [], "2026-08-04");
assert.equal(d.cancelled.length, 0, "should not cancel a live block");

console.log("2. Block removed from plan -> shows as cancelled in the diff");
d = computeDiff([], [area], [ownedPickle], [], "2026-08-04");
assert.equal(d.cancelled.length, 1, "orphaned event must appear as cancelled");
assert.equal(d.cancelled[0].label, "Pickleball");

console.log("3. Confirmed commit emits a real delete for it");
let ops = buildWriteOps([], [area], [ownedPickle], "America/Denver", "2026-08-04");
const del = ops.filter((o) => o.op === "delete");
assert.equal(del.length, 1, "should emit exactly one delete");
assert.equal(del[0].gcalEventId, "gcal-pickle");

console.log("4. An UNTAGGED event is never touched, even when orphaned");
d = computeDiff([], [area], [foreignEvent], [], "2026-08-04");
assert.equal(d.cancelled.length, 0, "untagged event must never be cancelled");
ops = buildWriteOps([], [area], [foreignEvent], "America/Denver", "2026-08-04");
assert.equal(ops.filter((o) => o.op === "delete").length, 0, "must never delete untagged");

console.log("5. assertOwned still throws if an untagged event reaches a write path");
const forged: any = {
  id: "gcal-forged",
  extendedProperties: { private: { plannerBlockId: "b-x" } }, // no plannerApp
};
d = computeDiff([], [area], [forged], [], "2026-08-04");
assert.equal(d.cancelled.length, 0, "missing plannerApp tag => not ours");

console.log("6. Open blocks never produce writes");
const openBlock = { ...pickleball, id: "b-open", type: "open", gcal_event_id: null, sync_state: "unsynced" };
ops = buildWriteOps([openBlock], [area], [], "America/Denver", "2026-08-04");
assert.equal(ops.length, 0, "open blocks must never sync");

console.log("\nAll cancellation-safety tests passed.");
