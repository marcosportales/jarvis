import "server-only"

import fs from "node:fs"
import path from "node:path"

import { openDatabase } from "./db"
import { createPlugins, type Plugins } from "./plugins"
import { createSqliteStore } from "./store"

const dbFile =
  process.env.JARVIS_DB_PATH ?? path.join(process.cwd(), ".data/jarvis.db")

// Reused across dev hot reloads so the database is opened once.
const globalForPlugins = globalThis as { plugins?: Plugins }

/** The Plugins module wired to real storage, OAuth and Connectors. */
export function getPlugins(): Plugins {
  if (!globalForPlugins.plugins) {
    fs.mkdirSync(path.dirname(dbFile), { recursive: true })
    globalForPlugins.plugins = createPlugins({
      env: process.env,
      store: createSqliteStore(openDatabase(dbFile)),
    })
  }
  return globalForPlugins.plugins
}
