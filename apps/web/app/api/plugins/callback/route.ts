import { cookies } from "next/headers"
import type { NextRequest } from "next/server"

import type { PendingInstall } from "@/lib/plugins/plugins"
import {
  CALLBACK_PATH,
  getPlugins,
  PENDING_INSTALL_COOKIE,
} from "@/lib/plugins/server"

function parsePending(value: string | undefined): PendingInstall | undefined {
  if (!value) return undefined
  try {
    const { pluginId, state, connectedAccountId } = JSON.parse(value) as Record<
      string,
      unknown
    >
    return typeof pluginId === "string" &&
      typeof state === "string" &&
      typeof connectedAccountId === "string"
      ? { pluginId, state, connectedAccountId }
      : undefined
  } catch {
    return undefined
  }
}

/** Where Composio sends the Owner back after the consent screen. */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const pending = parsePending(cookieStore.get(PENDING_INSTALL_COOKIE)?.value)
  cookieStore.delete({ name: PENDING_INSTALL_COOKIE, path: CALLBACK_PATH })

  const params = request.nextUrl.searchParams
  const result = await getPlugins().completeInstall({
    pending,
    callback: {
      state: params.get("state") ?? undefined,
      status: params.get("status") ?? undefined,
    },
  })

  const target = new URL("/plugins", request.nextUrl.origin)
  if (result.pluginId) target.searchParams.set("plugin", result.pluginId)
  if (result.ok) target.searchParams.set("installed", "1")
  else target.searchParams.set("error", result.reason)
  return Response.redirect(target, 303)
}
