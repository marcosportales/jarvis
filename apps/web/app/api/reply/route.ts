import { generateText, stepCountIs } from "ai"

import { nan, nanConfig } from "@/lib/jarvis/server/nan"
import { JARVIS_SYSTEM_PROMPT } from "@/lib/jarvis/server/system-prompt"
import type { TurnTools } from "@/lib/plugins/plugins"
import { getPlugins } from "@/lib/plugins/server"
import { getSessions } from "@/lib/sessions/server"
import { UnknownSessionError, type SavedTurn } from "@/lib/sessions/store"
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

const unknownSession = () =>
  Response.json({ error: "Unknown session" }, { status: 404 })

/** The earlier Turns as the chat model sees them. */
function toMessages(turns: SavedTurn[]) {
  return turns.flatMap(({ owner, reply }) => [
    { role: "user" as const, content: owner },
    { role: "assistant" as const, content: reply },
  ])
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
  const { sessionId, text, widgets, coords } = (await request.json()) as {
    sessionId?: unknown
    text?: unknown
    widgets?: unknown
    coords?: unknown
  }
  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "Invalid text" }, { status: 400 })
  }
  if (sessionId !== undefined && typeof sessionId !== "string") {
    return Response.json({ error: "Invalid sessionId" }, { status: 400 })
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

  const sessions = getSessions()
  const earlier = sessionId ? await sessions.recentTurns(sessionId) : []
  if (!earlier) return unknownSession()

  const turn = await loadTurnTools()
  const widgetTools = createWidgetTools(WIDGET_CATALOG)
  const weatherTools = createWeatherTools({
    weather: getWeather(),
    coords: owner.data,
  })
  try {
    const generated = await generateText({
      model: nan.chat(nanConfig.chatModel),
      system: [
        JARVIS_SYSTEM_PROMPT,
        currentDateLine(),
        widgetLayoutNotice(layout.data),
        ...turn.notices,
      ].join("\n\n"),
      messages: [...toMessages(earlier), { role: "user", content: text }],
      tools: { ...turn.tools, ...widgetTools.tools, ...weatherTools },
      stopWhen: stepCountIs(MAX_REPLY_STEPS),
    })

    const reply = generated.text.trim() || FALLBACK_REPLY

    // Saved only now that the Reply is ready, so a failed Turn saves nothing.
    const saved = { owner: text, reply }
    let savedIn: string
    if (sessionId) {
      await sessions.addTurn(sessionId, saved)
      savedIn = sessionId
    } else {
      savedIn = await sessions.start(saved)
    }

    return Response.json({
      sessionId: savedIn,
      text: reply,
      widgetChanges: widgetTools.changes(),
    })
  } catch (error) {
    // Deleted while Jarvis was Thinking.
    if (error instanceof UnknownSessionError) return unknownSession()
    throw error
  } finally {
    await turn.close()
  }
}
