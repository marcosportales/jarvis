import { getBrowse } from "@/lib/browse/server"

/** `GET /api/browse`: the Browse Task view, or `null` with no Browse Task. */
export async function GET() {
  return Response.json(await getBrowse().current())
}
