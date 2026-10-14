import "server-only"

import { createComposioPort } from "./composio"
import { createMcpConnector } from "./connector"
import {
  createPendingInstalls,
  createPlugins,
  type PendingInstalls,
  type Plugins,
} from "./plugins"

// One store for the whole server, so the callback route finds what the
// install action recorded. On globalThis so routes and dev hot reloads share it.
const globalForPlugins = globalThis as {
  jarvisPendingInstalls?: PendingInstalls
}

function pendingInstalls() {
  globalForPlugins.jarvisPendingInstalls ??= createPendingInstalls({
    now: () => new Date(),
  })
  return globalForPlugins.jarvisPendingInstalls
}

/** The Plugins module wired to Composio and real Connectors. */
export function getPlugins(): Plugins {
  const apiKey = process.env.COMPOSIO_API_KEY
  return createPlugins({
    composio: apiKey ? createComposioPort(apiKey) : null,
    connector: createMcpConnector(),
    pendingInstalls: pendingInstalls(),
  })
}

const CALLBACK_PATH = "/api/plugins/callback"

/** Where Composio sends the Owner back after the consent screen. */
export function callbackUrl(origin: string) {
  return new URL(CALLBACK_PATH, origin).toString()
}
