import type { OAuthProvider } from "./types"

/** https://developers.google.com/identity/protocols/oauth2/web-server */
export const google: OAuthProvider = {
  id: "google",
  clientIdEnv: "GOOGLE_CLIENT_ID",
  clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  revocationUrl: "https://oauth2.googleapis.com/revoke",
  // `offline` + `consent` so Google always returns a refresh token.
  authorizationParams: { access_type: "offline", prompt: "consent" },
}
