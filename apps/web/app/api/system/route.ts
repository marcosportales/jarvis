import type { NextRequest } from "next/server"

import { getHealth } from "@/lib/health/server"
import { getMachine } from "@/lib/machine/server"
import type { SystemSnapshot } from "@/lib/system/snapshot"

/** A failing read answers null rather than failing the route. */
async function readMachine() {
  try {
    return await getMachine().read()
  } catch (error) {
    console.error("Reading the computer failed", error)
    return null
  }
}

/**
 * `GET /api/system`: how the computer Jarvis runs on is doing, and Jarvis
 * Health. `?recheck=1` probes Health again straight away.
 */
export async function GET(request: NextRequest) {
  const recheck = request.nextUrl.searchParams.get("recheck") === "1"
  const [machine, health] = await Promise.all([
    readMachine(),
    getHealth().current({ recheck }),
  ])
  return Response.json({ machine, health } satisfies SystemSnapshot)
}
