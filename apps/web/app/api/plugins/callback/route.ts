import type { NextRequest } from "next/server"

import { getPlugins } from "@/lib/plugins/server"

/**
 * Where Composio sends the Owner back after the consent screen. It may be a
 * different browser from the one that started the Install, so only the
 * callback's own state identifies it.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const result = await getPlugins().completeInstall({
    state: params.get("state") ?? undefined,
    status: params.get("status") ?? undefined,
  })

  const target = new URL("/plugins", request.nextUrl.origin)
  if (result.pluginId) target.searchParams.set("plugin", result.pluginId)
  if (result.ok) target.searchParams.set("installed", "1")
  else target.searchParams.set("error", result.reason)
  return Response.redirect(target, 303)
}
