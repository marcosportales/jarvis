import { z } from "zod"

import { resultsOnScreenSchema } from "../search/outcome"
import { coordinatesSchema } from "../weather/weather"
import { widgetLayoutSchema } from "../widgets/changes"
import type { TurnRequest } from "./turn"

const turnRequestSchema = z.object({
  text: z.string().refine((text) => text.trim() !== ""),
  sessionId: z.string().optional(),
  widgets: widgetLayoutSchema,
  coords: coordinatesSchema
    .nullish()
    .transform((coords) => coords ?? undefined),
  results: resultsOnScreenSchema
    .nullish()
    .transform((results) => results ?? undefined),
}) satisfies z.ZodType<TurnRequest, unknown>

/** Leaves out fields that are absent, so the request has only what was sent. */
function withoutAbsent<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined)
  ) as T
}

/**
 * The reply route's body as a Turn request, or the first field that failed,
 * checked in the schema's order; a body that isn't an object fails on its
 * text, as it always has.
 */
export function parseTurnRequest(
  body: unknown
): { ok: true; request: TurnRequest } | { ok: false; field: string } {
  const parsed = turnRequestSchema.safeParse(body)
  if (!parsed.success) {
    return {
      ok: false,
      field: String(parsed.error.issues[0]?.path[0] ?? "text"),
    }
  }
  return { ok: true, request: withoutAbsent(parsed.data) }
}
