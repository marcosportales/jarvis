import { describe, expect, it } from "vitest"

import { captionOf } from "./caption"
import { ERRORS, type TranscriptEntry } from "./session"

let nextId = 1
const owner = (text: string): TranscriptEntry => ({
  id: nextId++,
  role: "owner",
  text,
})
const jarvis = (
  text: string,
  memoryEvents?: TranscriptEntry["memoryEvents"]
): TranscriptEntry => ({
  id: nextId++,
  role: "jarvis",
  text,
  ...(memoryEvents ? { memoryEvents } : {}),
})
const error = (text: string): TranscriptEntry => ({
  id: nextId++,
  role: "error",
  text,
})

describe("the Caption", () => {
  it("greets the Owner before the first Turn", () => {
    expect(captionOf([], "idle")).toEqual({ kind: "welcome" })
  })

  it("shows nothing while the next Utterance is captured", () => {
    expect(captionOf([owner("hola"), jarvis("¡Hola!")], "listening")).toBe(null)
    expect(captionOf([], "listening")).toBe(null)
  })

  it("shows what Jarvis understood while Thinking", () => {
    const transcript = [owner("hola"), jarvis("¡Hola!"), owner("¿qué hora es?")]

    expect(captionOf(transcript, "thinking")).toEqual({
      kind: "turn",
      owner: "¿qué hora es?",
    })
  })

  it("shows the whole last Turn while Speaking and after it", () => {
    const transcript = [
      owner("hola"),
      jarvis("¡Hola!"),
      owner("¿qué hora es?"),
      jarvis("Son las cinco."),
    ]

    for (const state of ["speaking", "idle"] as const) {
      expect(captionOf(transcript, state)).toEqual({
        kind: "turn",
        owner: "¿qué hora es?",
        reply: "Son las cinco.",
      })
    }
  })

  it("shows the Memories the Reply Remembered or Forgot", () => {
    const memoryEvents = [
      { kind: "remembered" as const, title: "Vive en Madrid" },
    ]

    expect(
      captionOf(
        [owner("vivo en Madrid"), jarvis("Apuntado.", memoryEvents)],
        "idle"
      )
    ).toEqual({
      kind: "turn",
      owner: "vivo en Madrid",
      reply: "Apuntado.",
      memoryEvents,
    })
  })

  it("shows a failed Reply with the Owner's words", () => {
    expect(captionOf([owner("hola"), error(ERRORS.reply)], "idle")).toEqual({
      kind: "turn",
      owner: "hola",
      error: ERRORS.reply,
    })
  })

  it("keeps a Reply that couldn't be played aloud", () => {
    expect(
      captionOf([owner("hola"), jarvis("¡Hola!"), error(ERRORS.voice)], "idle")
    ).toEqual({
      kind: "turn",
      owner: "hola",
      reply: "¡Hola!",
      error: ERRORS.voice,
    })
  })

  it("shows a failed transcription alone, not with the Turn before", () => {
    const transcript = [
      owner("hola"),
      jarvis("¡Hola!"),
      error(ERRORS.transcription),
    ]

    expect(captionOf(transcript, "idle")).toEqual({
      kind: "turn",
      error: ERRORS.transcription,
    })
  })

  it("shows a failure before any Turn alone", () => {
    expect(captionOf([error(ERRORS.microphone)], "idle")).toEqual({
      kind: "turn",
      error: ERRORS.microphone,
    })
  })
})
