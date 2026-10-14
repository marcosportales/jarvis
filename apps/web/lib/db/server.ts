import "server-only"

import fs from "node:fs"
import path from "node:path"

import { openDatabase, type JarvisDatabase } from "."

const dbFile =
  process.env.JARVIS_DB_PATH ?? path.join(process.cwd(), ".data/jarvis.db")

// The database is opened once and survives dev hot reloads.
const globalForDb = globalThis as { jarvisDb?: JarvisDatabase }

/** The shared Jarvis database, used by Plugins and Sessions. */
export function getDatabase() {
  if (!globalForDb.jarvisDb) {
    fs.mkdirSync(path.dirname(dbFile), { recursive: true })
    globalForDb.jarvisDb = openDatabase(dbFile)
  }
  return globalForDb.jarvisDb
}
