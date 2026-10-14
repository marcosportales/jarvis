import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const installedPlugins = sqliteTable("installed_plugins", {
  pluginId: text("plugin_id").primaryKey(),
  installedAt: integer("installed_at", { mode: "timestamp_ms" }).notNull(),
  /** False once a previously working authorization fails (shown as Reconnect). */
  connected: integer("connected", { mode: "boolean" }).notNull(),
})

/** OAuth tokens, stored unencrypted: Jarvis runs locally for a single Owner. */
export const pluginTokens = sqliteTable("plugin_tokens", {
  pluginId: text("plugin_id")
    .primaryKey()
    .references(() => installedPlugins.pluginId, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
})
