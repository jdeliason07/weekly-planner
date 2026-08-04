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
