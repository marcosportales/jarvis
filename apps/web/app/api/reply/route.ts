import { z } from "zod"

import { UnknownSessionError } from "@/lib/sessions/store"
import { getTurns } from "@/lib/turns/server"
import type { TurnRequest } from "@/lib/turns/turn"
import { coordinatesSchema } from "@/lib/weather/weather"
import { widgetLayoutSchema } from "@/lib/widgets/changes"

const turnRequestSchema = z.object({
  text: z.string().refine((text) => text.trim() !== ""),
  sessionId: z.string().optional(),
  widgets: widgetLayoutSchema,
  coords: coordinatesSchema
    .nullish()
    .transform((coords) => coords ?? undefined),
}) satisfies z.ZodType<TurnRequest, unknown>

export async function POST(request: Request) {
  const parsed = turnRequestSchema.safeParse(await request.json())
  if (!parsed.success) {
    // The first field that failed, checked in the schema's order; a body that
    // isn't an object fails on its text, as it always has.
    const field = parsed.error.issues[0]?.path[0] ?? "text"
    return Response.json({ error: `Invalid ${String(field)}` }, { status: 400 })
  }

  try {
    return Response.json(await getTurns().take(parsed.data))
  } catch (error) {
    if (error instanceof UnknownSessionError) {
      return Response.json({ error: "Unknown session" }, { status: 404 })
    }
    throw error
  }
}
