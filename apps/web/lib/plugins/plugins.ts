import { randomBytes } from "node:crypto"

import type { ToolSet } from "ai"

import { marketplace, type PluginEntry } from "./catalog"
import {
  ConnectorAuthError,
  type Connector,
  type ConnectorSession,
} from "./connector"
import { OAuthAuthError, type OAuthClient, type OAuthTokens } from "./oauth"
import type { PluginStore } from "./store"

export type Env = Record<string, string | undefined>

/**
 * - `not-configured`: the provider's OAuth credentials are missing from env.
 * - `installable`: not Installed; Install runs OAuth.
 * - `connected`: Installed and authorized; Jarvis can use it.
 * - `reconnect`: Installed, but its authorization stopped working.
 */
export type PluginState =
  "not-configured" | "installable" | "connected" | "reconnect"

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

/** What Jarvis may use during one Turn. Call `close` when the Turn ends. */
export type TurnTools = {
  tools: ToolSet
  /**
   * Problems with Plugins this Turn, written for the model so Jarvis can
   * explain them instead of the Turn failing.
   */
  notices: string[]
  close(): Promise<void>
}

/** Refresh tokens this close to expiry so they don't lapse mid-Turn. */
const EXPIRY_MARGIN_MS = 60_000

const isAuthFailure = (error: unknown) =>
  error instanceof OAuthAuthError || error instanceof ConnectorAuthError

/** Model-facing explanation of why a Plugin can't be used right now. */
function failureNotice(name: string, needsReconnect: boolean) {
  return needsReconnect
    ? `No tienes acceso a ${name}: su autorización dejó de funcionar. Si te preguntan por ${name}, explica en una frase que no pudiste acceder y que el dueño debe reconectarlo en Plugins.`
    : `${name} no responde ahora mismo. Si te preguntan por ${name}, explica en una frase que no pudiste acceder y que lo intente más tarde.`
}

export type PluginsDeps = {
  env: Env
  store: PluginStore
  oauth: OAuthClient
  connector: Connector
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
  connector,
  now = () => new Date(),
}: PluginsDeps) {
  const findEntry = (pluginId: string) =>
    marketplace.find((entry) => entry.id === pluginId)

  return {
    async listMarketplace(): Promise<MarketplaceItem[]> {
      const installed = new Map(
        (await store.listInstalled()).map((p) => [p.pluginId, p])
      )
      return marketplace.map((entry) => {
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
      // A cancelled consent changes nothing, so it needs no state check.
      if (pending && callback.error) {
        return { ok: false, pluginId: pending.pluginId, reason: "cancelled" }
      }
      if (!pending || !callback.state || callback.state !== pending.state) {
        return {
          ok: false,
          pluginId: pending?.pluginId,
          reason: "invalid-state",
        }
      }
      const { pluginId } = pending
      if (!callback.code) {
        return { ok: false, pluginId, reason: "cancelled" }
      }
      const entry = findEntry(pluginId)
      const credentials = entry && credentialsFor(entry, env)
      if (!entry || !credentials)
        return { ok: false, pluginId, reason: "failed" }

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

    /**
     * The allowlisted tools of every Connected Plugin, named `<plugin>_<tool>`.
     * Never throws because of a Plugin: problems become `notices`, and failing
     * tool calls return an explanation for the model.
     */
    async toolsForTurn(): Promise<TurnTools> {
      const sessions: ConnectorSession[] = []
      const tools: ToolSet = {}
      const notices: string[] = []

      for (const installed of await store.listInstalled()) {
        const entry = findEntry(installed.pluginId)
        if (!entry) continue
        if (!installed.connected) {
          notices.push(failureNotice(entry.name, true))
          continue
        }

        try {
          const { session, serverTools } = await openConnector(entry)
          sessions.push(session)
          for (const name of entry.connector.toolAllowlist) {
            const serverTool = serverTools[name]
            if (serverTool) {
              tools[`${entry.id}_${name}`] = guardToolCalls(entry, serverTool)
            }
          }
        } catch (error) {
          notices.push(await handleFailure(entry, error))
        }
      }

      return {
        tools,
        notices,
        async close() {
          await Promise.allSettled(sessions.map((session) => session.close()))
        },
      }
    },

    /**
     * Deletes the Plugin's tokens and Installed record. Revocation with the
     * provider is attempted, but failing to revoke doesn't block uninstalling.
     */
    async uninstall(pluginId: string): Promise<void> {
      const entry = findEntry(pluginId)
      const tokens = await store.getTokens(pluginId)
      await store.remove(pluginId)
      if (!entry || !tokens) return

      try {
        // Revoking the refresh token also invalidates its access tokens.
        await oauth.revoke({
          provider: entry.connector.oauth.provider,
          token: tokens.refreshToken ?? tokens.accessToken,
        })
      } catch (error) {
        console.error(`Revoking ${pluginId} failed; uninstalled anyway`, error)
      }
    },
  }

  /**
   * Connects and lists the server's tools. A token the Connector rejects gets
   * one refresh before the failure counts as the authorization being gone.
   */
  async function openConnector(entry: PluginEntry) {
    const attempt = async (accessToken: string) => {
      const session = await connector.connect({
        url: entry.connector.mcpUrl,
        accessToken,
      })
      try {
        return { session, serverTools: await session.tools() }
      } catch (error) {
        await session.close().catch(() => {})
        throw error
      }
    }
    try {
      return await attempt(await freshAccessToken(entry))
    } catch (error) {
      if (!(error instanceof ConnectorAuthError)) throw error
      return attempt(await refreshAccessToken(entry))
    }
  }

  /** The stored access token, refreshed first if it has (nearly) expired. */
  async function freshAccessToken(entry: PluginEntry) {
    const tokens = await store.getTokens(entry.id)
    if (!tokens) throw new OAuthAuthError("No tokens stored")
    const expiresSoon =
      tokens.expiresAt !== null &&
      tokens.expiresAt.getTime() - EXPIRY_MARGIN_MS <= now().getTime()
    return expiresSoon ? refreshAccessToken(entry) : tokens.accessToken
  }

  /** Gets a new access token with the refresh token and stores it. */
  async function refreshAccessToken(entry: PluginEntry) {
    const tokens = await store.getTokens(entry.id)
    if (!tokens) throw new OAuthAuthError("No tokens stored")
    const credentials = credentialsFor(entry, env)
    if (!tokens.refreshToken || !credentials) {
      throw new OAuthAuthError("Access token cannot be refreshed")
    }
    const refreshed = await oauth.refresh({
      provider: entry.connector.oauth.provider,
      credentials,
      refreshToken: tokens.refreshToken,
    })
    const next: OAuthTokens = {
      ...refreshed,
      refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
    }
    await store.saveTokens(entry.id, next)
    return next.accessToken
  }

  /** Records an auth failure as not Connected; returns the model-facing notice. */
  async function handleFailure(entry: PluginEntry, error: unknown) {
    console.error(`Plugin ${entry.id} failed during a Turn`, error)
    const needsReconnect = isAuthFailure(error)
    if (needsReconnect) {
      await store.markDisconnected(entry.id).catch((storeError: unknown) => {
        console.error(`Could not mark ${entry.id} disconnected`, storeError)
      })
    }
    return failureNotice(entry.name, needsReconnect)
  }

  /** A failing tool call yields `{ error }` for the model, never an exception. */
  function guardToolCalls(entry: PluginEntry, serverTool: ToolSet[string]) {
    const { execute } = serverTool
    if (!execute) return serverTool
    return {
      ...serverTool,
      execute: async (...args: Parameters<typeof execute>) => {
        try {
          return await execute(...args)
        } catch (error) {
          return { error: await handleFailure(entry, error) }
        }
      },
    }
  }
}

export type Plugins = ReturnType<typeof createPlugins>
