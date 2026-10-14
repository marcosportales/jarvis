import "server-only"

import { createComposioPort } from "./composio"
import { createMcpConnector } from "./connector"
import { createPlugins, type Plugins } from "./plugins"

/** The Plugins module wired to Composio and real Connectors. */
export function getPlugins(): Plugins {
  const apiKey = process.env.COMPOSIO_API_KEY
  return createPlugins({
    composio: apiKey ? createComposioPort(apiKey) : null,
    connector: createMcpConnector(),
  })
}

/** Cookie holding the PendingInstall between Install and the callback. */
export const PENDING_INSTALL_COOKIE = "jarvis_pending_install"

export const CALLBACK_PATH = "/api/plugins/callback"

/** Where Composio sends the Owner back after the consent screen. */
export function callbackUrl(origin: string) {
  return new URL(CALLBACK_PATH, origin).toString()
}
