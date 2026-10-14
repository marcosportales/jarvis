import "server-only"

import { getDatabase } from "../db/server"
import { createSessionStore, type SessionStore } from "./store"

/** The Sessions store over the shared Jarvis database. */
export function getSessions(): SessionStore {
  return createSessionStore(getDatabase())
}
