import { UnknownSessionError } from "@/lib/sessions/store"
import { parseTurnRequest } from "@/lib/turns/request"
import { getTurns } from "@/lib/turns/server"

export async function POST(request: Request) {
  const parsed = parseTurnRequest(await request.json())
  if (!parsed.ok) {
    return Response.json({ error: `Invalid ${parsed.field}` }, { status: 400 })
  }

  try {
    return Response.json(await getTurns().take(parsed.request))
  } catch (error) {
    if (error instanceof UnknownSessionError) {
      return Response.json({ error: "Unknown session" }, { status: 404 })
    }
    throw error
  }
}
