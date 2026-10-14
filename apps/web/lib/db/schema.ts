import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core"

import type { MemoryEvent } from "../memory/events"

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
  /** Reused to replace the Memory when what it says changes. */
  topicKey: text("topic_key").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  /** Where it was last Remembered; cleared, not cascaded, when that Session goes. */
  sourceSessionId: text("source_session_id").references(() => sessions.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
})

/**
 * The current Browse Task, if any: at most one row, replaced on each start
 * and kept after it ends until the next. It belongs to no Session.
 */
export const browseTask = sqliteTable("browse_task", {
  /** Composio's task id. */
  id: text("id").primaryKey(),
  /** Composio's remote browser session id, for the live view. */
  browserSessionId: text("browser_session_id").notNull(),
  /** What was asked, as the model wrote it, without the read-only wrapper. */
  task: text("task").notNull(),
  startUrl: text("start_url"),
  status: text("status", {
    enum: ["running", "finished", "failed", "stopped", "timed-out"],
  }).notNull(),
  currentGoal: text("current_goal"),
  currentUrl: text("current_url"),
  liveViewUrl: text("live_view_url"),
  screenshotUrl: text("screenshot_url"),
  lastStepSeen: integer("last_step_seen").notNull().default(0),
  outcome: text("outcome"),
  success: integer("success", { mode: "boolean" }),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
  checkedAt: integer("checked_at", { mode: "timestamp_ms" }).notNull(),
})
