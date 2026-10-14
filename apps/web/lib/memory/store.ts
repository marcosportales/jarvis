import { desc, eq, inArray, sql } from "drizzle-orm"

import type { JarvisDatabase } from "../db"
import { memories } from "../db/schema"

/** One Memory about the Owner. */
export type Memory = {
  topicKey: string
  title: string
  content: string
  /** The Session it was last Remembered in; null once that Session is deleted. */
  sourceSessionId: string | null
  createdAt: Date
  updatedAt: Date
}

export type NewMemory = {
  topicKey: string
  title: string
  content: string
  sourceSessionId?: string | null
}

/** Where Jarvis keeps its Memories, shared by every Session. */
export type MemoryStore = {
  /** Replaces the Memory with the same topic key, otherwise adds one. */
  remember(memory: NewMemory): Promise<void>
  /** Deletes the Memory with this topic key; null if there was none. */
  forget(topicKey: string): Promise<Memory | null>
  /** Points Memories at the Session they were Remembered in. */
  setSource(topicKeys: string[], sessionId: string): Promise<void>
  /** The Memories best matching the words of `query`, best first. */
  search(query: string, limit: number): Promise<Memory[]>
  /** Every Memory, newest-updated first. */
  all(): Promise<Memory[]>
}

/**
 * An FTS5 query matching any of the words, each by its start with a common
 * Spanish ending trimmed, so "hermanas" finds "hermana". Accents are ignored
 * by the index. Null when there are no words worth searching.
 */
function matchQuery(query: string) {
  const words = (query.match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((word) => word.length >= 3)
    .map((word) =>
      word.length > 4 ? word.replace(/(as|os|es|a|o|e|s)$/iu, "") : word
    )
  if (words.length === 0) return null
  // Quoted, so FTS5 operators in what the Owner said are just words.
  return words.map((word) => `"${word}"*`).join(" OR ")
}

export function createMemoryStore(
  db: JarvisDatabase,
  { now = () => new Date() }: { now?: () => Date } = {}
): MemoryStore {
  const columns = {
    topicKey: memories.topicKey,
    title: memories.title,
    content: memories.content,
    sourceSessionId: memories.sourceSessionId,
    createdAt: memories.createdAt,
    updatedAt: memories.updatedAt,
  }

  return {
    async remember({ topicKey, title, content, sourceSessionId = null }) {
      const at = now()
      db.insert(memories)
        .values({
          topicKey,
          title,
          content,
          sourceSessionId,
          createdAt: at,
          updatedAt: at,
        })
        .onConflictDoUpdate({
          target: memories.topicKey,
          set: { title, content, sourceSessionId, updatedAt: at },
        })
        .run()
    },

    async forget(topicKey) {
      return (
        db
          .delete(memories)
          .where(eq(memories.topicKey, topicKey))
          .returning(columns)
          .get() ?? null
      )
    },

    async setSource(topicKeys, sessionId) {
      if (topicKeys.length === 0) return
      db.update(memories)
        .set({ sourceSessionId: sessionId })
        .where(inArray(memories.topicKey, topicKeys))
        .run()
    },

    async search(query, limit) {
      const match = matchQuery(query)
      if (!match) return []
      const ranked = db
        .all<{ id: number }>(
          sql`SELECT rowid AS id FROM memories_fts WHERE memories_fts MATCH ${match} ORDER BY rank LIMIT ${limit}`
        )
        .map(({ id }) => id)
      if (ranked.length === 0) return []
      const found = db
        .select({ id: memories.id, ...columns })
        .from(memories)
        .where(inArray(memories.id, ranked))
        .all()
      return ranked.flatMap((rank) => {
        const memory = found.find(({ id }) => id === rank)
        if (!memory) return []
        const { id: _id, ...rest } = memory
        return [rest]
      })
    },

    async all() {
      return db
        .select(columns)
        .from(memories)
        .orderBy(desc(memories.updatedAt), desc(memories.id))
        .all()
    },
  }
}
