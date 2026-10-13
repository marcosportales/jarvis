import { generateText } from "ai"

import type { TranscriptLine } from "@/lib/jarvis/session"
import { nan, nanConfig } from "@/lib/jarvis/server/nan"
import { JARVIS_SYSTEM_PROMPT } from "@/lib/jarvis/server/system-prompt"

function isTranscriptLine(value: unknown): value is TranscriptLine {
  if (typeof value !== "object" || value === null) return false
  const { role, text } = value as Record<string, unknown>
  return (role === "owner" || role === "jarvis") && typeof text === "string"
}

export async function POST(request: Request) {
  const { lines } = (await request.json()) as { lines?: unknown }
  if (!Array.isArray(lines) || !lines.every(isTranscriptLine)) {
    return Response.json({ error: "Invalid lines" }, { status: 400 })
  }

  const { text } = await generateText({
    model: nan.chat(nanConfig.chatModel),
    system: JARVIS_SYSTEM_PROMPT,
    messages: lines.map(({ role, text }) => ({
      role: role === "owner" ? ("user" as const) : ("assistant" as const),
      content: text,
    })),
  })

  return Response.json({ text })
}
