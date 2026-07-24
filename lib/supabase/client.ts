// Browser Supabase client. Uses only the public anon key; RLS scopes every
// row to the signed-in user. Sign-in requests the Google Calendar scope so a
// provider token is available for sync (see SETUP.md).

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Kick off Google OAuth with the calendar.events scope and offline access, so
// Supabase surfaces provider_token and provider_refresh_token on the session.
export async function signInWithGoogle() {
  const supabase = createClient();
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: "https://www.googleapis.com/auth/calendar.events",
      queryParams: { access_type: "offline", prompt: "consent" },
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined,
    },
  });
}
