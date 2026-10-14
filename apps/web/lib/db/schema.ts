import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core"

import type { MemoryEvent } from "../memory/events"

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

/** A saved Session; it exists only once its first Turn is done. */
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    /** Empty until Jarvis gives the Session its Session Title. */
    title: text("title"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    lastActivityAt: integer("last_activity_at", {
      mode: "timestamp_ms",
    }).notNull(),
  },
  (table) => [
    index("sessions_last_activity").on(table.lastActivityAt, table.id),
  ]
)

/** One Turn of a Session: the Owner's text and Jarvis's Reply. */
export const turns = sqliteTable(
  "turns",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    ownerText: text("owner_text").notNull(),
    replyText: text("reply_text").notNull(),
    /** What Jarvis Remembered or Forgot during the Turn. */
    memoryEvents: text("memory_events", { mode: "json" })
      .$type<MemoryEvent[]>()
      .notNull()
      .default([]),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.sessionId, table.position] })]
)

/**
 * One Memory about the Owner, kept across all Sessions. An FTS5 index over its
 * title and content (`memories_fts`, kept in sync by triggers) lives only in
 * the migration, since Drizzle can't describe it.
 */
export const memories = sqliteTable("memories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Reused to replace the Memory when the fact changes. */
  topicKey: text("topic_key").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  /** Where it was learned; cleared, not cascaded, when that Session goes. */
  sourceSessionId: text("source_session_id").references(() => sessions.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
})
