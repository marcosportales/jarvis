import { desc, eq, inArray } from "drizzle-orm"

import type { JarvisDatabase } from "../db"
import { memories } from "../db/schema"

/** One durable fact about the Owner. */
export type Memory = {
  topicKey: string
  title: string
  content: string
  /** The Session it was learned in; null once that Session is deleted. */
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
  /** Points Memories at the Session they were learned in. */
  setSource(topicKeys: string[], sessionId: string): Promise<void>
  /** Every Memory, newest-updated first. */
  all(): Promise<Memory[]>
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

    async setSource(topicKeys, sessionId) {
      if (topicKeys.length === 0) return
      db.update(memories)
        .set({ sourceSessionId: sessionId })
        .where(inArray(memories.topicKey, topicKeys))
        .run()
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
