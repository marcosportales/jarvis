import { describe, expect, it } from "vitest"

import { withoutReasoning } from "./reasoning"

function recording() {
  const sent: { url: string; body?: unknown }[] = []
  const send = withoutReasoning(async (input, init) => {
    sent.push({
      url: String(input),
      body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
    })
    return new Response("{}")
  })
  return { send, sent }
}

describe("withoutReasoning", () => {
  it("turns reasoning off on chat requests, keeping the rest", async () => {
    const { send, sent } = recording()

    await send("https://api.nan.builders/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model: "deepseek-v4-flash", stream: true }),
    })

    expect(sent[0]?.body).toEqual({
      model: "deepseek-v4-flash",
      stream: true,
      chat_template_kwargs: { thinking: false },
    })
  })

  it("keeps other chat template settings", async () => {
    const { send, sent } = recording()

    await send("https://api.nan.builders/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ chat_template_kwargs: { other: 1 } }),
    })

    expect(sent[0]?.body).toEqual({
      chat_template_kwargs: { other: 1, thinking: false },
    })
  })

  it("leaves speech and transcription requests alone", async () => {
    const { send, sent } = recording()
    const speech = JSON.stringify({ input: "Hola" })
    const audio = new Blob(["…"])

    await send("https://api.nan.builders/v1/audio/speech", { body: speech })
    await send("https://api.nan.builders/v1/audio/transcriptions", {
      body: audio,
    })

    expect(sent[0]?.body).toEqual({ input: "Hola" })
    expect(sent[1]?.body).toBe(audio)
  })
})
