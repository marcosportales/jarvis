import { eq } from "drizzle-orm"

import type { PluginsDatabase } from "./db"
import { installedPlugins, pluginTokens } from "./db/schema"
import type { OAuthTokens } from "./oauth"

export type InstalledPlugin = {
  pluginId: string
  connected: boolean
}

/** Where Installed Plugins and their OAuth tokens are kept. */
export type PluginStore = {
  listInstalled(): Promise<InstalledPlugin[]>
  /** Records the Plugin as Installed and Connected with fresh tokens. */
  saveInstall(pluginId: string, tokens: OAuthTokens, at: Date): Promise<void>
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

    async saveInstall(pluginId, tokens, at) {
      db.transaction((tx) => {
        tx.insert(installedPlugins)
          .values({ pluginId, installedAt: at, connected: true })
          .onConflictDoUpdate({
            target: installedPlugins.pluginId,
            set: { connected: true },
          })
          .run()
        tx.delete(pluginTokens).where(eq(pluginTokens.pluginId, pluginId)).run()
        tx.insert(pluginTokens).values({ pluginId, ...tokens }).run()
      })
    },
  }
}
