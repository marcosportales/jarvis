import type { OAuthProvider } from "./catalog"

export type OAuthCredentials = { clientId: string; clientSecret: string }

export type OAuthTokens = {
  accessToken: string
  /** Absent when the provider didn't issue one (or didn't rotate it). */
  refreshToken: string | null
  expiresAt: Date | null
}

/**
 * The authorization is gone for good (refresh token rejected or access
 * revoked): only running OAuth again can restore it.
 */
export class OAuthAuthError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "OAuthAuthError"
  }
}

/** Talks to an OAuth provider's token and revocation endpoints. */
export type OAuthClient = {
  exchangeCode(args: {
    provider: OAuthProvider
    credentials: OAuthCredentials
    code: string
    redirectUri: string
  }): Promise<OAuthTokens>
  /** Throws `OAuthAuthError` when the provider rejects the refresh token. */
  refresh(args: {
    provider: OAuthProvider
    credentials: OAuthCredentials
    refreshToken: string
  }): Promise<OAuthTokens>
  revoke(args: { provider: OAuthProvider; token: string }): Promise<void>
}

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

/** A standard OAuth 2.0 client (RFC 6749 token requests, RFC 7009 revocation). */
export function createOAuthClient(fetchFn: typeof fetch = fetch): OAuthClient {
  async function requestTokens(
    provider: OAuthProvider,
    params: Record<string, string>
  ): Promise<OAuthTokens> {
    const response = await fetchFn(provider.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    })
    const body = (await response.json().catch(() => ({}))) as TokenResponse
    if (!response.ok || !body.access_token) {
      const message = `${provider.id} token request failed (HTTP ${response.status}): ${body.error ?? "unknown error"}`
      // RFC 6749 §5.2: the grant (code or refresh token) is invalid, expired or revoked.
      if (body.error === "invalid_grant") throw new OAuthAuthError(message)
      throw new Error(message)
    }
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token ?? null,
      expiresAt:
        body.expires_in === undefined
          ? null
          : new Date(Date.now() + body.expires_in * 1000),
    }
  }

  return {
    exchangeCode({ provider, credentials, code, redirectUri }) {
      return requestTokens(provider, {
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      })
    },
    refresh({ provider, credentials, refreshToken }) {
      return requestTokens(provider, {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      })
    },
    async revoke({ provider, token }) {
      if (!provider.revocationUrl) return
      const response = await fetchFn(provider.revocationUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token }),
      })
      if (!response.ok) {
        throw new Error(
          `${provider.id} revocation failed (HTTP ${response.status})`
        )
      }
    },
  }
}
