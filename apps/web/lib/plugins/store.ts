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
  getTokens(pluginId: string): Promise<OAuthTokens | undefined>
  saveTokens(pluginId: string, tokens: OAuthTokens): Promise<void>
  /** The authorization stopped working; the Plugin stays Installed. */
  markDisconnected(pluginId: string): Promise<void>
  /** Deletes the Installed record and its tokens. */
  remove(pluginId: string): Promise<void>
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
        tx.insert(pluginTokens)
          .values({ pluginId, ...tokens })
          .run()
      })
    },

    async getTokens(pluginId) {
      return db
        .select({
          accessToken: pluginTokens.accessToken,
          refreshToken: pluginTokens.refreshToken,
          expiresAt: pluginTokens.expiresAt,
        })
        .from(pluginTokens)
        .where(eq(pluginTokens.pluginId, pluginId))
        .get()
    },

    async saveTokens(pluginId, tokens) {
      db.update(pluginTokens)
        .set(tokens)
        .where(eq(pluginTokens.pluginId, pluginId))
        .run()
    },

    async markDisconnected(pluginId) {
      db.update(installedPlugins)
        .set({ connected: false })
        .where(eq(installedPlugins.pluginId, pluginId))
        .run()
    },

    async remove(pluginId) {
      // Tokens go with it (ON DELETE CASCADE).
      db.delete(installedPlugins)
        .where(eq(installedPlugins.pluginId, pluginId))
        .run()
    },
  }
}
