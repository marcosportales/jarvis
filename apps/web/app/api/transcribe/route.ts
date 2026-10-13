import { transcribe } from "ai"

import { nan, nanConfig } from "@/lib/jarvis/server/nan"

export async function POST(request: Request) {
  const audio = new Uint8Array(await request.arrayBuffer())
  if (audio.byteLength === 0) {
    return Response.json({ error: "Missing audio" }, { status: 400 })
  }

  const { text } = await transcribe({
    model: nan.transcription(nanConfig.transcriptionModel),
    audio,
    // The OpenAI provider reads its options under `openai`, whatever its name.
    providerOptions: { openai: { language: "es" } },
  })

  return Response.json({ text })
}
