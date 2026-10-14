import { getMachine } from "@/lib/machine/server"
import type { SystemStatus } from "@/lib/system/status"

/**
 * `GET /api/system`: how the computer Jarvis runs on is doing. A failing read
 * answers `machine: null` rather than failing the route.
 */
export async function GET() {
  let machine: SystemStatus["machine"] = null
  try {
    machine = await getMachine().read()
  } catch (error) {
    console.error("Reading the computer failed", error)
  }
  return Response.json({ machine } satisfies SystemStatus)
}
