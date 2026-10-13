import { marketplace, type PluginEntry } from "./catalog"
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

export type PluginsDeps = {
  env: Env
  store: PluginStore
  catalog?: PluginEntry[]
}

function credentialsFor(entry: PluginEntry, env: Env) {
  const { provider } = entry.connector.oauth
  const clientId = env[provider.clientIdEnv]
  const clientSecret = env[provider.clientSecretEnv]
  return clientId && clientSecret ? { clientId, clientSecret } : undefined
}

export function createPlugins({ env, store, catalog = marketplace }: PluginsDeps) {
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
  }
}

export type Plugins = ReturnType<typeof createPlugins>
