import { generateText, stepCountIs } from "ai"

import type { TranscriptLine } from "@/lib/jarvis/session"
import { nan, nanConfig } from "@/lib/jarvis/server/nan"
import { JARVIS_SYSTEM_PROMPT } from "@/lib/jarvis/server/system-prompt"
import type { TurnTools } from "@/lib/plugins/plugins"
import { getPlugins } from "@/lib/plugins/server"
import { getWeather } from "@/lib/weather/server"
import { createWeatherTools } from "@/lib/weather/tool"
import { coordinatesSchema } from "@/lib/weather/weather"
import { WIDGET_CATALOG } from "@/lib/widgets/catalog"
import { widgetLayoutSchema } from "@/lib/widgets/changes"
import { createWidgetTools, widgetLayoutNotice } from "@/lib/widgets/tools"

/** Bounds how many tool-use rounds a single Reply may take. */
const MAX_REPLY_STEPS = 5

/** Spoken when the step limit ends the Reply before the model said anything. */
const FALLBACK_REPLY =
  "Lo siento, no he podido terminar de consultarlo. ¿Me lo preguntas de otra forma?"

/** A Plugin problem must never fail the Turn, so fall back to no tools. */
async function loadTurnTools(): Promise<TurnTools> {
  try {
    return await getPlugins().toolsForTurn()
  } catch (error) {
    console.error("Loading Plugin tools failed", error)
    return { tools: {}, notices: [], close: async () => {} }
  }
}

function isTranscriptLine(value: unknown): value is TranscriptLine {
  if (typeof value !== "object" || value === null) return false
  const { role, text } = value as Record<string, unknown>
  return (role === "owner" || role === "jarvis") && typeof text === "string"
}

/** Lets the model resolve "hoy" or "esta semana" when searching a service. */
function currentDateLine() {
  const now = new Date().toLocaleString("es-ES", {
    dateStyle: "full",
    timeStyle: "short",
  })
  return `Fecha y hora actuales: ${now}.`
}

export async function POST(request: Request) {
  const { lines, widgets, coords } = (await request.json()) as {
    lines?: unknown
    widgets?: unknown
    coords?: unknown
  }
  if (!Array.isArray(lines) || !lines.every(isTranscriptLine)) {
    return Response.json({ error: "Invalid lines" }, { status: 400 })
  }
  const layout = widgetLayoutSchema.safeParse(widgets)
  if (!layout.success) {
    return Response.json({ error: "Invalid widgets" }, { status: 400 })
  }
  // The Owner's coordinates, only when the browser already had permission.
  const owner = coordinatesSchema.optional().safeParse(coords ?? undefined)
  if (!owner.success) {
    return Response.json({ error: "Invalid coords" }, { status: 400 })
  }

  const turn = await loadTurnTools()
  const widgetTools = createWidgetTools(WIDGET_CATALOG)
  const weatherTools = createWeatherTools({
    weather: getWeather(),
    coords: owner.data,
  })
  try {
    const { text } = await generateText({
      model: nan.chat(nanConfig.chatModel),
      system: [
        JARVIS_SYSTEM_PROMPT,
        currentDateLine(),
        widgetLayoutNotice(layout.data),
        ...turn.notices,
      ].join("\n\n"),
      messages: lines.map(({ role, text }) => ({
        role: role === "owner" ? ("user" as const) : ("assistant" as const),
        content: text,
      })),
      tools: { ...turn.tools, ...widgetTools.tools, ...weatherTools },
      stopWhen: stepCountIs(MAX_REPLY_STEPS),
    })

    return Response.json({
      text: text.trim() || FALLBACK_REPLY,
      widgetChanges: widgetTools.changes(),
    })
  } finally {
    await turn.close()
  }
}
