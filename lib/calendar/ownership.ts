// The ownership rule, enforced structurally in ONE place.
//
// Jack has had a calendar wiped by an automated bulk delete before. The app
// may only update or delete events that carry OUR tag. Any event lacking the
// tag is read-only, permanently — no override, no admin mode, no force flag.
//
// Every write path (see sync.ts) resolves the target event through
// assertOwned() before issuing an update or delete. There is no other way to
// obtain a writable event handle in this codebase.

export const PLANNER_APP = "weekmachine";

export interface GCalEvent {
  id: string;
  summary?: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

// The tag written on every event this app creates.
export function ownershipTag(plannerBlockId: string): {
  private: Record<string, string>;
} {
  return {
    private: {
      plannerBlockId,
      plannerApp: PLANNER_APP,
    },
  };
}

// True only when the event carries our app tag.
export function isOwnedByApp(event: GCalEvent): boolean {
  return event.extendedProperties?.private?.plannerApp === PLANNER_APP;
}

export class OwnershipError extends Error {
  constructor(eventId: string) {
    super(
      `Refusing to modify calendar event ${eventId}: it was not created by Week Machine.`
    );
    this.name = "OwnershipError";
  }
}

// The single gate. Any update/delete MUST pass its target through here. Throws
// OwnershipError for anything untagged — callers cannot bypass it because
// this is the only function that returns a writable id.
export function assertOwned(event: GCalEvent): string {
  if (!isOwnedByApp(event)) {
    throw new OwnershipError(event.id);
  }
  return event.id;
}

// The query every ownership-scoped read must use, so the app only ever sees
// its own events as candidates for modification.
export const OWNED_EVENTS_QUERY = {
  privateExtendedProperty: `plannerApp=${PLANNER_APP}`,
} as const;

// ---------------------------------------------------------------------------
// User-directed deletion of an OUTSIDE event.
//
// This is the one path that can remove a calendar event Week Machine did not
// create. It exists because Jack explicitly asked for "cancel my pickleball
// Tuesday" to just work. It is deliberately separate from assertOwned() so
// that every OTHER write path — the whole bulk sync — keeps the original
// guarantee untouched. Sync can never reach this function.
//
// What this path does NOT allow, by construction:
//   - bulk deletion. It takes ONE event and returns ONE id. There is no
//     array-shaped variant, so "cancel everything" has nowhere to land. This
//     is the specific failure that wiped a calendar before.
//   - ambiguous deletion. The caller must have resolved the request to
//     exactly one event first; `matchCount` proves it did.
//   - silent deletion. Every call must supply the phrase that requested it,
//     and callers record the result so it can be undone.
export class AmbiguousDeletionError extends Error {
  constructor(public readonly matchCount: number) {
    super(
      matchCount === 0
        ? "Nothing on the calendar matches that."
        : `That matches ${matchCount} events — name which one.`
    );
    this.name = "AmbiguousDeletionError";
  }
}

export interface UserDeletionRequest {
  /** The event to remove. Exactly one. */
  event: GCalEvent;
  /** How many events the user's phrase matched. Must be 1. */
  matchCount: number;
  /** The user's own words, kept for the audit log. */
  requestedBy: string;
}

export function authorizeUserRequestedDeletion(
  req: UserDeletionRequest
): string {
  if (req.matchCount !== 1) {
    throw new AmbiguousDeletionError(req.matchCount);
  }
  if (!req.requestedBy.trim()) {
    throw new Error("A user-requested deletion must record what was asked.");
  }
  return req.event.id;
}
