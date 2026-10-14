import { getBrowse } from "@/lib/browse/server"

/**
 * `POST /api/browse/stop`: stops the running Browse Task. Answers the view
 * as it is afterwards, or `null` with no Browse Task; 502 if it won't stop.
 */
export async function POST() {
  const browse = getBrowse()
  try {
    await browse.stop()
  } catch (error) {
    console.error("Stopping the Browse Task failed", error)
    return Response.json({ error: "Could not stop" }, { status: 502 })
  }
  return Response.json(await browse.current())
}
