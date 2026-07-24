# Setup

Demo mode needs nothing. Wiring the real backend (persistence, Google
sign-in, the Ask panel, calendar sync) needs three accounts you own: Supabase,
Google Cloud, and Anthropic. Work top to bottom.

## 0. Environment file

```bash
cp .env.example .env.local
```

Fill it in as you complete each section below. Set
`NEXT_PUBLIC_DEMO_MODE=0` once Supabase is connected.

---

## 1. Supabase (Postgres + Auth)

1. Create a project at <https://supabase.com>.
2. **Project Settings → API** — copy into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only — never shipped to the browser)
3. **Run the schema.** In the SQL editor, paste and run
   [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
   This creates every table with row-level security on and policies scoping
   rows to the signed-in user.
4. Verify RLS is on: **Database → Tables** should show a shield on all six
   tables.

The eleven areas are seeded into your account on first sign-in (from
`lib/seed.ts`). Nothing to run by hand.

---

## 2. Google sign-in with the Calendar scope

The app plans against your real calendar and writes only its own events, so
sign-in requests the `calendar.events` scope.

1. **Google Cloud Console** → create (or pick) a project.
2. **APIs & Services → Enable APIs** → enable **Google Calendar API**.
3. **OAuth consent screen** → External → add your email as a test user.
4. **Credentials → Create OAuth client ID → Web application.**
   - Authorized redirect URI:
     `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - Copy the client ID and secret.
5. In **Supabase → Authentication → Providers → Google**, paste that client ID
   and secret and enable the provider.
6. Put the same values in `.env.local` as `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET` — the sync route uses them to refresh the access
   token server-side.

**How tokens flow (the important gotcha).** Sign-in uses:

```ts
scopes: 'https://www.googleapis.com/auth/calendar.events'
queryParams: { access_type: 'offline', prompt: 'consent' }
```

Supabase then surfaces `provider_token` and `provider_refresh_token` on the
session. The **access token expires in ~1 hour**, so it is not enough to store
it once. Store the **refresh token** securely server-side in the auth callback
and call `freshAccessToken()` (`lib/google/tokens.ts`) before every Calendar
API call. A revoked/expired grant throws `GoogleAuthError`, which the sync UI
surfaces as "reconnect your calendar" — never as a generic sync failure.

> **Token round-trip check (do this before building further):** sign in, then
> in a server route read the session's `provider_refresh_token`, exchange it
> via `freshAccessToken()`, and call the Calendar API `events.list`. If you get
> events back, the round-trip works. This is the phase-1 gate.

---

## 3. Anthropic (the Ask panel)

1. Get an API key at <https://console.anthropic.com>.
2. Set `ANTHROPIC_API_KEY` in `.env.local` (server only).

The call runs entirely in `/api/ask` (`app/api/ask/route.ts`). The key and the
system prompt never reach the browser. Without the key, the Ask panel loads and
tells you it isn't connected — it never crashes the app.

---

## 4. Deploy (Vercel)

1. Import the repo at <https://vercel.com>.
2. Add every variable from `.env.local` to the project's environment variables.
   Mark `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, and
   `GOOGLE_CLIENT_SECRET` as **not** exposed to the browser (they have no
   `NEXT_PUBLIC_` prefix, so they aren't — keep it that way).
3. Add your Vercel URL to Supabase **Authentication → URL Configuration →
   Redirect URLs**.

---

## Calendar safety — how it's enforced

Read this if you're extending the sync path. The safety model is structural,
not a convention you have to remember:

- Every event the app writes is tagged
  `extendedProperties.private = { plannerApp: "weekmachine", plannerBlockId }`.
- The app only ever *sees* its own events as writable, by listing with
  `privateExtendedProperty=plannerApp=weekmachine`.
- `assertOwned()` in `lib/calendar/ownership.ts` is the **only** function that
  returns a writable event id, and it throws `OwnershipError` for anything
  untagged. Every update/delete in `lib/calendar/sync.ts` routes its target
  through it. There is no force flag, and adding one would mean removing that
  gate on purpose.
- Sync is always two steps: a dry-run diff (with an "untouched" count that
  bounds the blast radius), then a human-confirmed commit.
- Open blocks are filtered out of every write path. They never sync.

To sanity-check it: create an untagged event by hand in your calendar and
confirm no code path in the app can move or delete it.
