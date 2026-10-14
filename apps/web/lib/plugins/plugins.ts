import { randomBytes } from "node:crypto"

import type { ToolSet } from "ai"

import { marketplace, type PluginEntry } from "./catalog"
import type { ComposioPort, ConnectedAccount } from "./composio"
import type { Connector, ConnectorSession } from "./connector"

/**
 * - `not-configured`: the Composio API key is missing from env.
 * - `installable`: not Installed; Install runs the consent flow.
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
export type PendingInstall = {
  pluginId: string
  state: string
  /** The account Composio created for this Install; the only one we trust. */
  connectedAccountId: string
}

export type BeginInstallResult =
  | { ok: true; authorizationUrl: string; pending: PendingInstall }
  | { ok: false; reason: "unknown-plugin" | "not-configured" | "failed" }

/** Query params Composio sends back to the callback. */
export type InstallCallback = {
  /** Ours, carried through Composio in the callback URL. */
  state?: string
  /** Composio's `success` or `failed`; only the account's status is trusted. */
  status?: string
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

/** Account statuses whose authorization stopped working (shown as Reconnect). */
const BROKEN_STATUSES = new Set(["EXPIRED", "FAILED", "INACTIVE", "REVOKED"])

/** Account statuses of a consent flow that was started but not finished. */
const PENDING_STATUSES = new Set(["INITIATED", "INITIALIZING"])

function stateOf(accounts: ConnectedAccount[]): PluginState {
  if (accounts.some((account) => account.status === "ACTIVE")) {
    return "connected"
  }
  if (accounts.some((account) => BROKEN_STATUSES.has(account.status))) {
    return "reconnect"
  }
  return "installable"
}

/** Model-facing explanations of why a Plugin can't be used right now. */
const reconnectNotice = (name: string) =>
  `No tienes acceso a ${name}: su autorización dejó de funcionar. Si te preguntan por ${name}, explica en una frase que no pudiste acceder y que el dueño debe reconectarlo en Plugins.`

const unavailableNotice = (name: string) =>
  `${name} no responde ahora mismo. Si te preguntan por ${name}, explica en una frase que no pudiste acceder y que lo intente más tarde.`

const PLUGINS_UNAVAILABLE_NOTICE =
  "Ahora mismo no puedes acceder a ningún servicio de los Plugins. Si te preguntan por uno, explica en una frase que no pudiste acceder y que lo intente más tarde."

export type PluginsDeps = {
  /** `null` when the Composio API key is missing: every Plugin is not configured. */
  composio: ComposioPort | null
  connector: Connector
}

export function createPlugins({ composio, connector }: PluginsDeps) {
  const findEntry = (pluginId: string) =>
    marketplace.find((entry) => entry.id === pluginId)

  /** The Owner's accounts, grouped by the Marketplace entry they belong to. */
  async function accountsByPlugin(port: ComposioPort) {
    const accounts = await port.listAccounts(
      marketplace.map((entry) => entry.toolkit)
    )
    return marketplace.map((entry) => ({
      entry,
      accounts: accounts.filter((account) => account.toolkit === entry.toolkit),
    }))
  }

  /** Deletes accounts, logging failures: cleanup never fails an Install. */
  async function deleteQuietly(port: ComposioPort, ids: string[]) {
    await Promise.all(
      ids.map((id) =>
        port.deleteAccount(id).catch((error: unknown) => {
          console.error(`Could not delete Composio account ${id}`, error)
        })
      )
    )
  }

  return {
    /** Throws when Composio can't be reached. */
    async listMarketplace(): Promise<MarketplaceItem[]> {
      const item = (entry: PluginEntry, state: PluginState) => ({
        id: entry.id,
        name: entry.name,
        icon: entry.icon,
        state,
      })
      if (!composio) {
        return marketplace.map((entry) => item(entry, "not-configured"))
      }
      return (await accountsByPlugin(composio)).map(({ entry, accounts }) =>
        item(entry, stateOf(accounts))
      )
    },

    /** Install (and Reconnect) starts at the consent screen Composio returns. */
    async beginInstall(
      pluginId: string,
      { callbackUrl }: { callbackUrl: string }
    ): Promise<BeginInstallResult> {
      const entry = findEntry(pluginId)
      if (!entry) return { ok: false, reason: "unknown-plugin" }
      if (!composio) return { ok: false, reason: "not-configured" }

      const state = randomBytes(32).toString("base64url")
      const callbackWithState = new URL(callbackUrl)
      callbackWithState.searchParams.set("state", state)
      try {
        const { connectedAccountId, redirectUrl } = await composio.authorize({
          toolkit: entry.toolkit,
          callbackUrl: callbackWithState.toString(),
        })
        return {
          ok: true,
          authorizationUrl: redirectUrl,
          pending: { pluginId, state, connectedAccountId },
        }
      } catch (error) {
        console.error(`Starting Install of ${pluginId} failed`, error)
        return { ok: false, reason: "failed" }
      }
    },

    /**
     * Finishes Install when Composio redirects back. Install and connect are
     * one action: unless the account is ACTIVE, nothing is Installed, and the
     * attempt's account is deleted. A success deletes the toolkit's accounts
     * that don't work, so one working connection remains.
     */
    async completeInstall({
      pending,
      callback,
    }: {
      pending: PendingInstall | undefined
      callback: InstallCallback
    }): Promise<CompleteInstallResult> {
      if (!pending || !callback.state || callback.state !== pending.state) {
        return {
          ok: false,
          pluginId: pending?.pluginId,
          reason: "invalid-state",
        }
      }
      const { pluginId, connectedAccountId } = pending
      const entry = findEntry(pluginId)
      if (!entry || !composio) return { ok: false, pluginId, reason: "failed" }

      try {
        const account = await composio.getAccount(connectedAccountId)
        if (account.toolkit !== entry.toolkit) {
          return { ok: false, pluginId, reason: "failed" }
        }
        if (account.status !== "ACTIVE") {
          await deleteQuietly(composio, [connectedAccountId])
          const cancelled = PENDING_STATUSES.has(account.status)
          return {
            ok: false,
            pluginId,
            reason: cancelled ? "cancelled" : "failed",
          }
        }
        const others = await composio.listAccounts([entry.toolkit])
        await deleteQuietly(
          composio,
          others
            .filter((other) => other.status !== "ACTIVE")
            .map((other) => other.id)
        )
      } catch (error) {
        console.error(`Install of ${pluginId} failed`, error)
        return { ok: false, pluginId, reason: "failed" }
      }
      return { ok: true, pluginId }
    },

    /**
     * The allowlisted tools of every Connected Plugin, under their Composio
     * slugs, from one Composio session. Never throws because of a Plugin:
     * problems become `notices`, and failing tool calls return an explanation
     * for the model.
     */
    async toolsForTurn(): Promise<TurnTools> {
      const none = async () => {}
      if (!composio) return { tools: {}, notices: [], close: none }

      let plugins
      try {
        plugins = await accountsByPlugin(composio)
      } catch (error) {
        console.error("Composio failed at the start of a Turn", error)
        return { tools: {}, notices: [PLUGINS_UNAVAILABLE_NOTICE], close: none }
      }

      const notices: string[] = []
      const connected: PluginEntry[] = []
      for (const { entry, accounts } of plugins) {
        const state = stateOf(accounts)
        if (state === "connected") connected.push(entry)
        if (state === "reconnect") notices.push(reconnectNotice(entry.name))
      }
      if (connected.length === 0) return { tools: {}, notices, close: none }

      let session: ConnectorSession | undefined
      const tools: ToolSet = {}
      try {
        const mcp = await composio.openSession({
          tools: Object.fromEntries(
            connected.map((entry) => [entry.toolkit, entry.toolAllowlist])
          ),
        })
        session = await connector.connect(mcp)
        const served = await session.tools()
        // The session is already limited; the allowlist is checked again here.
        for (const entry of connected) {
          for (const name of entry.toolAllowlist) {
            const servedTool = served[name]
            if (servedTool) tools[name] = guardToolCalls(entry, servedTool)
          }
        }
      } catch (error) {
        console.error("Opening the Composio session failed", error)
        await session?.close().catch(() => {})
        session = undefined
        notices.push(...connected.map((entry) => unavailableNotice(entry.name)))
      }

      return {
        tools,
        notices,
        async close() {
          await session?.close().catch((error: unknown) => {
            console.error("Closing the Composio session failed", error)
          })
        },
      }
    },

    /**
     * Deletes every one of the Plugin's connected accounts at Composio. Throws
     * if any can't be deleted, so the Owner isn't told it's gone when it isn't.
     */
    async uninstall(pluginId: string): Promise<void> {
      const entry = findEntry(pluginId)
      if (!entry || !composio) return
      const accounts = await composio.listAccounts([entry.toolkit])
      await Promise.all(
        accounts.map((account) => composio.deleteAccount(account.id))
      )
    },
  }

  /** A failing tool call yields `{ error }` for the model, never an exception. */
  function guardToolCalls(entry: PluginEntry, servedTool: ToolSet[string]) {
    const { execute } = servedTool
    if (!execute) return servedTool
    return {
      ...servedTool,
      execute: async (...args: Parameters<typeof execute>) => {
        try {
          return await execute(...args)
        } catch (error) {
          console.error(`A ${entry.name} tool call failed`, error)
          return { error: unavailableNotice(entry.name) }
        }
      },
    }
  }
}

export type Plugins = ReturnType<typeof createPlugins>
