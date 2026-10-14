import { and, desc, eq, lt, max, or } from "drizzle-orm"

import type { JarvisDatabase } from "../db"
import { sessions, turns } from "../db/schema"

/** How many of the most recent Turns Jarvis is given. */
export const RECENT_TURNS = 20

/** How many Sessions one page of the list holds. */
export const SESSIONS_PAGE_SIZE = 20

/** A saved Turn: what the Owner said and Jarvis's Reply. */
export type SavedTurn = { owner: string; reply: string }

/** A Session as the list shows it. */
export type SessionSummary = {
  id: string
  /** Null until Jarvis gives it a Session Title. */
  title: string | null
  createdAt: Date
  lastActivityAt: Date
}

/** One page of the list; `nextCursor` is null on the last page. */
export type SessionPage = {
  sessions: SessionSummary[]
  nextCursor: string | null
}

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
  /** A page of Sessions by last activity, newest first. */
  list(cursor?: string): Promise<SessionPage>
  /** One Session as the list shows it; null if it doesn't exist. */
  get(sessionId: string): Promise<SessionSummary | null>
  setTitle(sessionId: string, title: string): Promise<void>
}

// The cursor is the last listed Session's position in the order: its last
// activity, then its id to break ties.
function encodeCursor({ lastActivityAt, id }: SessionSummary) {
  return `${lastActivityAt.getTime()}.${id}`
}

function decodeCursor(cursor: string) {
  const dot = cursor.indexOf(".")
  const ms = Number(cursor.slice(0, dot))
  if (dot < 0 || !Number.isInteger(ms)) return null
  return { lastActivityAt: new Date(ms), id: cursor.slice(dot + 1) }
}

export function createSessionStore(
  db: JarvisDatabase,
  {
    now = () => new Date(),
    newId = () => crypto.randomUUID(),
  }: { now?: () => Date; newId?: () => string } = {}
): SessionStore {
  const summary = {
    id: sessions.id,
    title: sessions.title,
    createdAt: sessions.createdAt,
    lastActivityAt: sessions.lastActivityAt,
  }

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

    async list(cursor) {
      const after = cursor ? decodeCursor(cursor) : undefined
      if (after === null) return { sessions: [], nextCursor: null }
      const rows = db
        .select(summary)
        .from(sessions)
        .where(
          after &&
            or(
              lt(sessions.lastActivityAt, after.lastActivityAt),
              and(
                eq(sessions.lastActivityAt, after.lastActivityAt),
                lt(sessions.id, after.id)
              )
            )
        )
        .orderBy(desc(sessions.lastActivityAt), desc(sessions.id))
        // One extra row tells whether there is a next page.
        .limit(SESSIONS_PAGE_SIZE + 1)
        .all()
      const page = rows.slice(0, SESSIONS_PAGE_SIZE)
      return {
        sessions: page,
        nextCursor:
          rows.length > SESSIONS_PAGE_SIZE ? encodeCursor(page.at(-1)!) : null,
      }
    },

    async get(sessionId) {
      return (
        db
          .select(summary)
          .from(sessions)
          .where(eq(sessions.id, sessionId))
          .get() ?? null
      )
    },

    async setTitle(sessionId, title) {
      db.update(sessions).set({ title }).where(eq(sessions.id, sessionId)).run()
    },
  }
}
