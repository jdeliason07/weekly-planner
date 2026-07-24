# Week Machine

A personal weekly planning tool. You allocate your week against eleven
competing life areas *before* the week starts, see the moment you're
overcommitted, talk it through with an assistant that can actually move things,
and push the result to Google Calendar — without it ever touching an event it
didn't create.

Not a to-do app, not a time tracker, not a habit tracker.

The identity is the 1984 Macintosh: a Fog-beige plastic chassis around a
strictly 1-bit CRT. Eleven areas, no color — each area is a **fill pattern**.
Where something needs to read as gray, it's dithered.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Out of the box it runs in **demo mode** (`NEXT_PUBLIC_DEMO_MODE=1` in
`.env.example`): the eleven seeded areas and a starter template load into an
in-memory week so you can review the design system, the budget meter, and
tap-to-place planning with no accounts. Nothing is persisted and nothing
touches a calendar.

To connect Supabase, Google sign-in, the Ask panel, and calendar sync, follow
[`SETUP.md`](./SETUP.md).

## What's built (and what's next)

See [`docs/STATUS.md`](./docs/STATUS.md) for the phase-by-phase state. In short:
the design system, the eleven patterns, the chrome primitives, the budget
meter, the planning grid, the Ask route handler with server + client
validation, and the calendar **safety module** (structural ownership rule,
open-never-syncs, dry-run diff) are in. Supabase persistence, live Google
sign-in, the sync UI, and the weekly review are the remaining phases.

## The non-negotiables (enforced in code, not by convention)

- The app can never modify or delete a calendar event it didn't create
  (`lib/calendar/ownership.ts` — a single gate every write passes through).
- Open blocks never reach the calendar (`lib/calendar/sync.ts`).
- The Ask panel can only mutate the draft week — there is no code path from it
  to the calendar.
- Every assistant action is validated on the server *and* again before it
  touches state (`lib/ask/validate.ts`).
- The budget meter is always visible while planning.
- No color, gradient, blur, or gray inside the screen — ever. Dither instead.

## Stack

Next.js (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth) ·
Anthropic (server-side, in `/api/ask`). Deploys to Vercel.
