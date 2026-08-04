// User-directed deletion of OUTSIDE calendar events.
//
// Run with:  npx tsx lib/calendar/__tests__/cancel-external.test.mts
//
// This is the one path that can delete an event Week Machine did not create,
// and it runs with NO confirmation step. These tests are the safety net: they
// assert it can only ever remove one clearly-identified event, and that no
// model reply can turn it into a bulk wipe.

import assert from "node:assert";
import {
  authorizeUserRequestedDeletion,
  AmbiguousDeletionError,
} from "../ownership.js";
import { validateAll, validateAction } from "../../ask/validate.js";

const externalEvents: any[] = [
  {
    gcal_event_id: "ev-pickle",
    date: "2026-08-04",
    start_time: "18:00",
    end_time: "19:30",
    title: "Pickleball",
    ownedByApp: false,
  },
  {
    gcal_event_id: "ev-dentist",
    date: "2026-08-05",
    start_time: "11:00",
    end_time: "12:00",
    title: "Dentist",
    ownedByApp: false,
  },
  {
    gcal_event_id: "ev-ours",
    date: "2026-08-06",
    start_time: "09:00",
    end_time: "10:00",
    title: "Lectures",
    ownedByApp: true, // created by Week Machine
  },
];

const ctx: any = {
  areas: [],
  weekStartsOn: 0,
  blockIds: new Set<string>(),
  externalEvents,
};

console.log("1. A clearly named outside event can be cancelled");
let out = validateAll([{ action: "cancel_event", id: "ev-pickle" }], ctx);
assert.equal(out.length, 1);
assert.equal((out[0] as any).title, "Pickleball");

console.log("2. An invented event id is rejected");
out = validateAll([{ action: "cancel_event", id: "ev-does-not-exist" }], ctx);
assert.equal(out.length, 0, "must not delete an id that isn't on the calendar");

console.log("3. App-created events are NOT deletable through this path");
out = validateAll([{ action: "cancel_event", id: "ev-ours" }], ctx);
assert.equal(out.length, 0, "app-owned events go through the ownership-gated sync");

console.log("4. A reply asking to cancel EVERYTHING deletes at most one");
out = validateAll(
  [
    { action: "cancel_event", id: "ev-pickle" },
    { action: "cancel_event", id: "ev-dentist" },
  ],
  ctx
);
const cancels = out.filter((a: any) => a.action === "cancel_event");
assert.equal(cancels.length, 1, "bulk deletion must be impossible");

console.log("5. Ambiguous requests delete nothing");
assert.throws(
  () =>
    authorizeUserRequestedDeletion({
      event: { id: "ev-pickle", summary: "Pickleball" },
      matchCount: 2,
      requestedBy: "cancel my thing",
    }),
  AmbiguousDeletionError
);
assert.throws(
  () =>
    authorizeUserRequestedDeletion({
      event: { id: "ev-pickle", summary: "Pickleball" },
      matchCount: 0,
      requestedBy: "cancel my thing",
    }),
  AmbiguousDeletionError
);

console.log("6. A deletion must record what asked for it");
assert.throws(() =>
  authorizeUserRequestedDeletion({
    event: { id: "ev-pickle", summary: "Pickleball" },
    matchCount: 1,
    requestedBy: "   ",
  })
);

console.log("7. Exactly one match authorizes exactly one id");
assert.equal(
  authorizeUserRequestedDeletion({
    event: { id: "ev-pickle", summary: "Pickleball" },
    matchCount: 1,
    requestedBy: "cancel my pickleball tuesday",
  }),
  "ev-pickle"
);

console.log("8. Malformed cancel actions are dropped, never thrown");
for (const bad of [
  { action: "cancel_event" },
  { action: "cancel_event", id: 42 },
  { action: "cancel_event", id: null },
  { action: "cancel_event", id: "" },
]) {
  const r = validateAction(bad as any, ctx);
  assert.equal(r.ok, false, `should reject ${JSON.stringify(bad)}`);
}

console.log("\nAll outside-event cancellation tests passed.");
