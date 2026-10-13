import type { PluginsDatabase } from "./db"
import { installedPlugins } from "./db/schema"

export type InstalledPlugin = {
  pluginId: string
  connected: boolean
}

/** Where Installed Plugins and their OAuth tokens are kept. */
export type PluginStore = {
  listInstalled(): Promise<InstalledPlugin[]>
}

export function createSqliteStore(db: PluginsDatabase): PluginStore {
  return {
    async listInstalled() {
      return db
        .select({
          pluginId: installedPlugins.pluginId,
          connected: installedPlugins.connected,
        })
        .from(installedPlugins)
        .all()
    },
  }
}
