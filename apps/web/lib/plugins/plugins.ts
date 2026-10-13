import { randomBytes } from "node:crypto"

import { marketplace, type PluginEntry } from "./catalog"
import type { OAuthClient } from "./oauth"
import type { PluginStore } from "./store"

export type Env = Record<string, string | undefined>

/**
 * - `not-configured`: the provider's OAuth credentials are missing from env.
 * - `installable`: not Installed; Install runs OAuth.
 * - `connected`: Installed and authorized; Jarvis can use it.
 * - `reconnect`: Installed, but its authorization stopped working.
 */
export type PluginState =
  | "not-configured"
  | "installable"
  | "connected"
  | "reconnect"

export type MarketplaceItem = {
  id: string
  name: string
  icon: string
  state: PluginState
}

/**
 * An Install waiting for the Owner to come back from the consent screen. The
 * caller keeps it somewhere only this browser can present (an httpOnly cookie).
 */
export type PendingInstall = { pluginId: string; state: string }

export type BeginInstallResult =
  | { ok: true; authorizationUrl: string; pending: PendingInstall }
  | { ok: false; reason: "unknown-plugin" | "not-configured" }

/** Query params the provider sends back to the OAuth callback. */
export type OAuthCallback = {
  code?: string
  state?: string
  error?: string
}

export type CompleteInstallResult =
  | { ok: true; pluginId: string }
  | {
      ok: false
      pluginId?: string
      reason: "cancelled" | "invalid-state" | "failed"
    }

export type PluginsDeps = {
  env: Env
  store: PluginStore
  oauth: OAuthClient
  catalog?: PluginEntry[]
  now?: () => Date
}

function credentialsFor(entry: PluginEntry, env: Env) {
  const { provider } = entry.connector.oauth
  const clientId = env[provider.clientIdEnv]
  const clientSecret = env[provider.clientSecretEnv]
  return clientId && clientSecret ? { clientId, clientSecret } : undefined
}

export function createPlugins({
  env,
  store,
  oauth,
  catalog = marketplace,
  now = () => new Date(),
}: PluginsDeps) {
  const findEntry = (pluginId: string) =>
    catalog.find((entry) => entry.id === pluginId)

  return {
    async listMarketplace(): Promise<MarketplaceItem[]> {
      const installed = new Map(
        (await store.listInstalled()).map((p) => [p.pluginId, p])
      )
      return catalog.map((entry) => {
        const record = installed.get(entry.id)
        const state: PluginState = !credentialsFor(entry, env)
          ? "not-configured"
          : !record
            ? "installable"
            : record.connected
              ? "connected"
              : "reconnect"
        return { id: entry.id, name: entry.name, icon: entry.icon, state }
      })
    },

    /** Install (and Reconnect) starts at the provider's consent screen. */
    async beginInstall(
      pluginId: string,
      { redirectUri }: { redirectUri: string }
    ): Promise<BeginInstallResult> {
      const entry = findEntry(pluginId)
      if (!entry) return { ok: false, reason: "unknown-plugin" }
      const credentials = credentialsFor(entry, env)
      if (!credentials) return { ok: false, reason: "not-configured" }

      const { provider, scopes } = entry.connector.oauth
      const state = randomBytes(32).toString("base64url")
      const url = new URL(provider.authorizationUrl)
      url.search = new URLSearchParams({
        client_id: credentials.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes.join(" "),
        state,
        ...provider.authorizationParams,
      }).toString()
      return {
        ok: true,
        authorizationUrl: url.toString(),
        pending: { pluginId, state },
      }
    },

    /**
     * Finishes Install when the provider redirects back. Install and connect
     * are one action: unless this succeeds, nothing is Installed.
     */
    async completeInstall({
      pending,
      redirectUri,
      callback,
    }: {
      pending: PendingInstall | undefined
      redirectUri: string
      callback: OAuthCallback
    }): Promise<CompleteInstallResult> {
      if (!pending || !callback.state || callback.state !== pending.state) {
        return { ok: false, pluginId: pending?.pluginId, reason: "invalid-state" }
      }
      const { pluginId } = pending
      if (callback.error || !callback.code) {
        return { ok: false, pluginId, reason: "cancelled" }
      }
      const entry = findEntry(pluginId)
      const credentials = entry && credentialsFor(entry, env)
      if (!entry || !credentials) return { ok: false, pluginId, reason: "failed" }

      try {
        const tokens = await oauth.exchangeCode({
          provider: entry.connector.oauth.provider,
          credentials,
          code: callback.code,
          redirectUri,
        })
        await store.saveInstall(pluginId, tokens, now())
      } catch (error) {
        console.error(`Install of ${pluginId} failed`, error)
        return { ok: false, pluginId, reason: "failed" }
      }
      return { ok: true, pluginId }
    },
  }
}

export type Plugins = ReturnType<typeof createPlugins>
