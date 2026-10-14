import { desc, eq, max } from "drizzle-orm"

import type { JarvisDatabase } from "../db"
import { sessions, turns } from "../db/schema"

/** How many of the most recent Turns Jarvis is given. */
export const RECENT_TURNS = 20

/** A saved Turn: what the Owner said and Jarvis's Reply. */
export type SavedTurn = { owner: string; reply: string }

export class UnknownSessionError extends Error {
  constructor(sessionId: string) {
    super(`Unknown Session ${sessionId}`)
  }
}

/** Where Sessions and their Turns are kept. */
export type SessionStore = {
  /** Saves a new Session with its first Turn and returns its id. */
  start(turn: SavedTurn): Promise<string>
  /** Appends a Turn and bumps the Session's last activity. */
  addTurn(sessionId: string, turn: SavedTurn): Promise<void>
  /** The last Turns of a Session, oldest first; null if it doesn't exist. */
  recentTurns(sessionId: string): Promise<SavedTurn[] | null>
  /** Every Turn of a Session, oldest first; null if it doesn't exist. */
  transcript(sessionId: string): Promise<SavedTurn[] | null>
}

export function createSessionStore(
  db: JarvisDatabase,
  {
    now = () => new Date(),
    newId = () => crypto.randomUUID(),
  }: { now?: () => Date; newId?: () => string } = {}
): SessionStore {
  function exists(sessionId: string) {
    return (
      db
        .select({ id: sessions.id })
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .get() !== undefined
    )
  }

  function turnsOf(sessionId: string, limit?: number) {
    const query = db
      .select({ owner: turns.ownerText, reply: turns.replyText })
      .from(turns)
      .where(eq(turns.sessionId, sessionId))
      .orderBy(desc(turns.position))
    const newestFirst = limit ? query.limit(limit).all() : query.all()
    return newestFirst.reverse()
  }

  return {
    async start(turn) {
      const id = newId()
      const at = now()
      db.transaction((tx) => {
        tx.insert(sessions)
          .values({ id, title: null, createdAt: at, lastActivityAt: at })
          .run()
        tx.insert(turns)
          .values({
            sessionId: id,
            position: 0,
            ownerText: turn.owner,
            replyText: turn.reply,
            createdAt: at,
          })
          .run()
      })
      return id
    },

    async addTurn(sessionId, turn) {
      const at = now()
      db.transaction((tx) => {
        const updated = tx
          .update(sessions)
          .set({ lastActivityAt: at })
          .where(eq(sessions.id, sessionId))
          .run()
        if (updated.changes === 0) throw new UnknownSessionError(sessionId)
        const last = tx
          .select({ position: max(turns.position) })
          .from(turns)
          .where(eq(turns.sessionId, sessionId))
          .get()
        tx.insert(turns)
          .values({
            sessionId,
            position: (last?.position ?? -1) + 1,
            ownerText: turn.owner,
            replyText: turn.reply,
            createdAt: at,
          })
          .run()
      })
    },

    async recentTurns(sessionId) {
      if (!exists(sessionId)) return null
      return turnsOf(sessionId, RECENT_TURNS)
    },

    async transcript(sessionId) {
      if (!exists(sessionId)) return null
      return turnsOf(sessionId)
    },
  }
}
