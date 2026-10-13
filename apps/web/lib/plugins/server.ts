import "server-only"

import fs from "node:fs"
import path from "node:path"

import { openDatabase, type PluginsDatabase } from "./db"
import { createOAuthClient } from "./oauth"
import { createPlugins, type Plugins } from "./plugins"
import { createSqliteStore } from "./store"

const dbFile =
  process.env.JARVIS_DB_PATH ?? path.join(process.cwd(), ".data/jarvis.db")

// The database is opened once and survives dev hot reloads.
const globalForPlugins = globalThis as { pluginsDb?: PluginsDatabase }

function database() {
  if (!globalForPlugins.pluginsDb) {
    fs.mkdirSync(path.dirname(dbFile), { recursive: true })
    globalForPlugins.pluginsDb = openDatabase(dbFile)
  }
  return globalForPlugins.pluginsDb
}

/** The Plugins module wired to real storage, OAuth and Connectors. */
export function getPlugins(): Plugins {
  return createPlugins({
    env: process.env,
    store: createSqliteStore(database()),
    oauth: createOAuthClient(),
  })
}

/** Cookie holding the PendingInstall between Install and the OAuth callback. */
export const PENDING_INSTALL_COOKIE = "jarvis_pending_install"

export const CALLBACK_PATH = "/api/plugins/callback"

/** Must match the redirect URI registered on the provider's OAuth client. */
export function callbackUrl(origin: string) {
  return new URL(CALLBACK_PATH, origin).toString()
}
