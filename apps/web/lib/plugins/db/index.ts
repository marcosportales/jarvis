import path from "node:path"

import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"

import * as schema from "./schema"

const migrationsFolder = path.join(process.cwd(), "lib/plugins/db/migrations")

/** Opens (creating if needed) the SQLite database and applies migrations. */
export function openDatabase(file: string) {
  const sqlite = new Database(file)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder })
  return db
}

export type PluginsDatabase = ReturnType<typeof openDatabase>
