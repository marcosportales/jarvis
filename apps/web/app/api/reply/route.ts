import { generateText, stepCountIs } from "ai"

import type { TranscriptLine } from "@/lib/jarvis/session"
import { nan, nanConfig } from "@/lib/jarvis/server/nan"
import { JARVIS_SYSTEM_PROMPT } from "@/lib/jarvis/server/system-prompt"
import { getPlugins } from "@/lib/plugins/server"

/** Bounds how many tool-use rounds a single Reply may take. */
const MAX_REPLY_STEPS = 5

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
  const { lines } = (await request.json()) as { lines?: unknown }
  if (!Array.isArray(lines) || !lines.every(isTranscriptLine)) {
    return Response.json({ error: "Invalid lines" }, { status: 400 })
  }

  const turn = await getPlugins().toolsForTurn()
  try {
    const { text } = await generateText({
      model: nan.chat(nanConfig.chatModel),
      system: [JARVIS_SYSTEM_PROMPT, currentDateLine(), ...turn.notices].join(
        "\n\n"
      ),
      messages: lines.map(({ role, text }) => ({
        role: role === "owner" ? ("user" as const) : ("assistant" as const),
        content: text,
      })),
      tools: turn.tools,
      stopWhen: stepCountIs(MAX_REPLY_STEPS),
    })

    return Response.json({ text })
  } finally {
    await turn.close()
  }
}
