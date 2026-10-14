import { generateSpeech } from "ai"

import { isServiceFailure } from "@/lib/health/health"
import { reportToHealth } from "@/lib/health/server"
import { nan, nanConfig } from "@/lib/jarvis/server/nan"

export async function POST(request: Request) {
  const { text } = (await request.json()) as { text?: unknown }
  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "Missing text" }, { status: 400 })
  }

  let audio: Awaited<ReturnType<typeof generateSpeech>>["audio"]
  try {
    ;({ audio } = await generateSpeech({
      model: nan.speech(nanConfig.speechModel),
      text,
      voice: nanConfig.voice,
      outputFormat: "mp3",
    }))
  } catch (error) {
    if (isServiceFailure(error)) reportToHealth("speaking", { ok: false })
    throw error
  }
  reportToHealth("speaking", { ok: true })

  return new Response(new Uint8Array(audio.uint8Array), {
    headers: { "Content-Type": audio.mediaType },
  })
}
