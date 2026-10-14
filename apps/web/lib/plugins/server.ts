import "server-only"

import { getDatabase } from "../db/server"
import { createMcpConnector } from "./connector"
import { createOAuthClient } from "./oauth"
import { createPlugins, type Plugins } from "./plugins"
import { createSqliteStore } from "./store"

/** The Plugins module wired to real storage, OAuth and Connectors. */
export function getPlugins(): Plugins {
  return createPlugins({
    env: process.env,
    store: createSqliteStore(getDatabase()),
    oauth: createOAuthClient(),
    connector: createMcpConnector(),
  })
}

/** Cookie holding the PendingInstall between Install and the OAuth callback. */
export const PENDING_INSTALL_COOKIE = "jarvis_pending_install"

export const CALLBACK_PATH = "/api/plugins/callback"

/** Must match the redirect URI registered on the provider's OAuth client. */
export function callbackUrl(origin: string) {
  return new URL(CALLBACK_PATH, origin).toString()
}
