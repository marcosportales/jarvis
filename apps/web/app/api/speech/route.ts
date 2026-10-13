import { generateSpeech } from "ai"

import { nan, nanConfig } from "@/lib/jarvis/server/nan"

export async function POST(request: Request) {
  const { text } = (await request.json()) as { text?: unknown }
  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "Missing text" }, { status: 400 })
  }

  const { audio } = await generateSpeech({
    model: nan.speech(nanConfig.speechModel),
    text,
    voice: nanConfig.voice,
    outputFormat: "mp3",
  })

  return new Response(new Uint8Array(audio.uint8Array), {
    headers: { "Content-Type": audio.mediaType },
  })
}
