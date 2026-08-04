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
| 3 | Areas | **Done.** Full editor (menu → AREAS): create, rename, rank ▲▼, targets, default type, season end date, success definition, archive. Settings (sleep, week start, timezone) live beside it. |
| 4 | Template week + grid | **Done.** Tap-to-place grid, day columns + time gutter, locked external events rendered read-only *on top* so clashes are visible, live budget meter (segmented bar, targets marker, OVER BY inversion). Blocks edit in place from the selection bar: label, type, day, ±30m shift and resize. |
| 5 | Week instances | **Done (local).** LOAD TMPL instantiates the template into the current week (expired sprints auto-retire); SAVE TMPL explicitly promotes the week back. Editing a week never touches the template. State persists in localStorage until Supabase lands. |
| 6 | Ask panel | **Done.** Server route (`/api/ask`), server-side system prompt + key, robust JSON parsing (fence-strip + brace-extract), and validation that runs on the server *and again* in the store before mutating state. Malformed/hostile actions are dropped, never thrown. |
| 7 | Sync | **UI + policy done; live transport pending.** The SYNC view renders the dry-run diff (computed by the same `computeDiff` the transport will use — new/moved/expired + untouched count) and a confirmed commit that currently applies locally. Connecting Google (SETUP.md) swaps in the real `CalendarClient`; ownership gate and open-never-syncs already enforced. |
| 8 | Check-offs + review | **Done.** Mark Done on any selected block; the REVIEW view shows planned vs. completed hours per area (pattern fill = done, GREY25 = planned-not-done). No further analytics, on purpose. |

## UI pass (post-launch)

The first build was structurally right but read as a cramped webpage. A
mobile-first overhaul followed:

- **App shell:** the machine fills the viewport; content scrolls inside the
  screen, no page-level scroll or rubber-banding from the Home Screen.
- **The grid** renders at a fixed 48px/hour and scrolls, instead of crushing
  17 hours into leftover space. Opens at the morning, draws a "now" line,
  and splits overlapping blocks into side-by-side columns (`lib/layout.ts`).
- **Budget meter** leads with UNCLAIMED / OVER BY at 26px; the full equation
  moved behind a HOW? toggle with a plain-language feasibility read.
- **Week navigation:** blocks are stored across weeks and selected by the
  week in view, so you can plan ahead. Load/save template and clear act on
  the visible week only.
- **Mobile:** Ask is its own view, the day switcher shows day + date, areas
  became a collapsible tray with per-target progress, and the armed state is
  a full-width black banner.

## Touch gestures

The grid is driven by direct manipulation, not just buttons:

- **Swipe** left/right on a day to move day to day; it rolls into the next or
  previous week at the edges rather than dead-ending.
- **Pinch** (or ctrl/⌘+wheel) to zoom between four stops — whole day at a
  glance through 15-minute detail. Zoom tracks your fingers live and settles
  on the nearest stop; the middle of the view stays anchored so you don't lose
  your place. Snap granularity follows the zoom (30m → 5m).
- **Long-press a block** to lift it, then drag to another time. Holding near
  the left or right edge steps the day and the block travels with it.
- **Tap a block** to reveal two corner dots — top-left drags the start, bottom
  right drags the end. Selecting scrolls the block fully into view so both
  dots stay reachable above the selection bar.

Gestures never fight each other: vertical scrolling stays the browser's job
(`touch-action: pan-y`), a horizontal swipe needs to beat a 1.6:1 axis ratio,
finger travel over 10px cancels a pending long-press, and surface gestures
stand down entirely while a block is lifted. Drags preview in local state and
commit once on release, so abandoning one changes nothing.

## Also in

- **PWA / Add to Home Screen:** manifest, generated icons
  (`scripts/gen-icons.mjs`), service worker (network-first pages, cache-first
  assets, never caches `/api/`), iOS standalone metadata.
- **Persistence:** the whole planning state survives reloads via
  localStorage (versioned key), until Supabase replaces it.

## Suggested next steps, in order

1. Deploy to Vercel (SETUP.md §4) so the app is on your phone's Home Screen.
2. Do the `SETUP.md` phase-1 token round-trip to confirm Google access works
   end to end.
3. Swap the localStorage store (`lib/store.tsx`) for Supabase reads/writes —
   the action surface is deliberately the shape a DB-backed store exposes.
4. Wire the live `CalendarClient` transport behind the existing SYNC view.

## Known gaps / decisions to confirm

- No `weekly-planner-mac.jsx` prototype was present, so visuals were built from
  the written spec. If you drop the prototype in, reconcile any pixel-level
  differences — per the brief, the prototype wins.
- Season dates (Dec 18, Nov 7) were seeded for **2026**; adjust in `lib/seed.ts`
  if the target semester differs.
- Sleep defaults to 8h/night and timezone to `America/Denver` — both are
  `user_settings` and should be set from the real profile once auth is live.
