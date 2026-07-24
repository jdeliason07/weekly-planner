# Build status

The brief lays out eight phases and asks to stop for review at each boundary.
This is the **first reviewable deliverable**: the foundation through the core
planning experience, plus the structural safety pieces that are expensive to
retrofit. It runs today in demo mode with no accounts.

Because a coding agent can't provision your Supabase project, Google OAuth app,
or Vercel deploy, those live steps are documented in [`SETUP.md`](../SETUP.md)
rather than done for you. The code paths that use them are built and wired.

## Phase state

| # | Phase | State |
|---|---|---|
| 1 | Schema + auth | **Schema done** (`supabase/migrations/0001_init.sql`, full RLS). Auth client + Google scope wired (`lib/supabase`, `lib/google/tokens.ts`); the live sign-in + token round-trip is a `SETUP.md` step. |
| 2 | Design system | **Done.** Chassis, 1-bit screen, Silkscreen + Geneva roles, all eleven patterns + GREY50/GREY25, and the chrome primitives (Window, TitleBar, MacBtn, MenuBar, PatternFill) as reusable components. |
| 3 | Areas | **Partial.** The eleven areas are seeded and drive planning; ranking is respected. The create/edit/rank *UI* is stubbed (menu → AREAS) and is the next thing to build. |
| 4 | Template week + grid | **Done for the core.** Tap-to-place grid, seven day columns + time gutter, locked external events rendered read-only, and the live budget meter (segmented bar, targets marker, OVER BY inversion). Template-vs-instance separation is modeled; "Save to template" promotion is Phase 5. |
| 5 | Week instances | **Modeled, not yet surfaced.** Types and store distinguish template blocks from planned blocks; loading/promotion UI is pending. |
| 6 | Ask panel | **Done.** Server route (`/api/ask`), server-side system prompt + key, robust JSON parsing (fence-strip + brace-extract), and validation that runs on the server *and again* in the store before mutating state. Malformed/hostile actions are dropped, never thrown. |
| 7 | Sync | **Safety core done, UI pending.** Ownership rule (single `assertOwned` gate), open-never-syncs, dry-run diff with untouched count, recurrence + explicit timezone on every write, and a `CalendarClient` interface for the transport. The read/diff/commit *screens* and the live Calendar transport are the next build. |
| 8 | Check-offs + review | **Partial.** Blocks can be marked done (select a block → Mark Done); the weekly planned-vs-completed review screen is pending. |

## Suggested next steps, in order

1. Do the `SETUP.md` phase-1 token round-trip to confirm Google access works
   end to end.
2. Swap the in-memory store (`lib/store.tsx`) for Supabase reads/writes — the
   action surface is deliberately the shape a DB-backed store will expose.
3. Build the Areas editor (Phase 3) and the sync screens (Phase 7) on top of
   the primitives and the safety module, both of which are already in place.

## Known gaps / decisions to confirm

- No `weekly-planner-mac.jsx` prototype was present, so visuals were built from
  the written spec. If you drop the prototype in, reconcile any pixel-level
  differences — per the brief, the prototype wins.
- Season dates (Dec 18, Nov 7) were seeded for **2026**; adjust in `lib/seed.ts`
  if the target semester differs.
- Sleep defaults to 8h/night and timezone to `America/Denver` — both are
  `user_settings` and should be set from the real profile once auth is live.
