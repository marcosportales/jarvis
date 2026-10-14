import "server-only"

import { createComposioSearchPort, type SearchPort } from "./port"

/** Composio Search over the same key as the Plugins. */
export function getSearch(): SearchPort {
  return createComposioSearchPort(process.env.COMPOSIO_API_KEY)
}
