import { transcribe } from "ai"

import { isServiceFailure } from "@/lib/health/health"
import { reportToHealth } from "@/lib/health/server"
import { nan, nanConfig } from "@/lib/jarvis/server/nan"

export async function POST(request: Request) {
  const audio = new Uint8Array(await request.arrayBuffer())
  if (audio.byteLength === 0) {
    return Response.json({ error: "Missing audio" }, { status: 400 })
  }

  let text: string
  try {
    ;({ text } = await transcribe({
      model: nan.transcription(nanConfig.transcriptionModel),
      audio,
      // The OpenAI provider reads its options under `openai`, whatever its name.
      providerOptions: { openai: { language: "es" } },
    }))
  } catch (error) {
    if (isServiceFailure(error)) reportToHealth("understanding", { ok: false })
    throw error
  }
  reportToHealth("understanding", { ok: true })

  return Response.json({ text })
}
