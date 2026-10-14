import "server-only"

import { getDatabase } from "../db/server"
import { createMemoryStore, type MemoryStore } from "./store"

/** Jarvis's Memories over the shared Jarvis database. */
export function getMemories(): MemoryStore {
  return createMemoryStore(getDatabase())
}
