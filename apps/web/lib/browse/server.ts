import "server-only"

import { getDatabase } from "../db/server"
import { createBrowse, type Browse } from "./browse"
import { createComposioBrowserPort } from "./port"

// One per server, so a running Browse Task is only refreshed once at a time.
const globalForBrowse = globalThis as { jarvisBrowse?: Browse }

/** The Browse module over the shared database and Composio's browser tool. */
export function getBrowse(): Browse {
  globalForBrowse.jarvisBrowse ??= createBrowse({
    db: getDatabase(),
    port: createComposioBrowserPort(process.env.COMPOSIO_API_KEY),
    now: () => new Date(),
  })
  return globalForBrowse.jarvisBrowse
}
