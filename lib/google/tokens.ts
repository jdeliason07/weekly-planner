// Google provider-token handling.
//
// Known gotcha: Supabase surfaces `provider_token` and
// `provider_refresh_token` on the session, and the access token expires in
// about an hour. We store the refresh token securely server-side and refresh
// before Calendar API calls, so a stale token never surfaces as a generic
// "sync failed".
//
// This helper exchanges a refresh token for a fresh access token. Wire the
// storage of the refresh token in the auth callback (see SETUP.md); the sync
// route calls freshAccessToken() before touching the Calendar API.

export interface TokenResult {
  accessToken: string;
  expiresAt: number; // epoch ms
}

export async function freshAccessToken(
  refreshToken: string
): Promise<TokenResult> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new GoogleAuthError(
      "Google client credentials are not configured on the server."
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    // Distinguish an expired/revoked grant so the UI can prompt re-consent
    // instead of showing a generic failure.
    throw new GoogleAuthError(
      `Couldn't refresh Google access. You may need to reconnect your calendar. (${res.status}) ${detail}`
    );
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleAuthError";
  }
}
