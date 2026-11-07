import { describe, expect, it } from "vitest"

import {
  createPauses,
  DEFAULT_PAUSES,
  FRAME_MS,
  type PauseEvent,
} from "./pauses"

const SPEECH = 0.9
const QUIET = 0.05

/** Feeds `ms` of frames at `probability`, each frame tagged with `tag`. */
function feed(
  pauses: ReturnType<typeof createPauses>,
  probability: number,
  ms: number,
  tag = 0
) {
  const events: PauseEvent[] = []
  for (let at = 0; at < ms; at += FRAME_MS) {
    events.push(...pauses.push(probability, new Float32Array([tag])))
  }
  return events
}

const types = (events: PauseEvent[]) => events.map(({ type }) => type)

describe("Pauses", () => {
  it("starts speech after the minimum speech, even with a gap in it", () => {
    const pauses = createPauses()

    const events = [
      ...feed(pauses, SPEECH, 160),
      ...feed(pauses, QUIET, 96),
      ...feed(pauses, SPEECH, 160),
    ]

    expect(types(events)).toEqual(["speechStarted"])
  })

  describe("the interrupt gate, while Jarvis is Speaking", () => {
    it("never starts on a cough and an mm-hm", () => {
      const pauses = createPauses()
      pauses.setInterruptGate(true)

      const events = [
        ...feed(pauses, SPEECH, 224),
        ...feed(pauses, QUIET, 160),
        ...feed(pauses, SPEECH, 416),
        ...feed(pauses, QUIET, 2000),
      ]

      expect(events).toEqual([])
    })

    it("starts speech after about half a second of it without a pause", () => {
      const pauses = createPauses()
      pauses.setInterruptGate(true)

      expect(types(feed(pauses, SPEECH, 512))).toEqual([])
      expect(types(feed(pauses, SPEECH, 64))).toEqual(["speechStarted"])
    })

    it("leaves a cough heard before the Owner talks over the Reply out of their Utterance", () => {
      const pauses = createPauses()
      pauses.setInterruptGate(true)

      feed(pauses, SPEECH, 224, 1)
      feed(pauses, QUIET, DEFAULT_PAUSES.piecePauseMs + 96, 2)
      const events = [
        ...feed(pauses, SPEECH, 640, 3),
        ...feed(pauses, QUIET, DEFAULT_PAUSES.endOfTurnPauseMs, 4),
      ]

      const tags = events.flatMap((event) =>
        event.type === "piece" ? event.frames.map(([tag]) => tag) : []
      )
      expect(types(events)).toEqual(["speechStarted", "piece", "endOfTurn"])
      expect(tags).not.toContain(1)
      expect(tags.filter((tag) => tag === 3)).toHaveLength(640 / FRAME_MS)
    })

    it("keeps the pre-roll on the first piece", () => {
      const pauses = createPauses()
      pauses.setInterruptGate(true)

      feed(pauses, QUIET, 1000, 1)
      feed(pauses, SPEECH, 640, 2)
      const events = feed(pauses, QUIET, DEFAULT_PAUSES.piecePauseMs, 3)

      const piece = events.find((event) => event.type === "piece")
      const tags =
        piece?.type === "piece" ? piece.frames.map(([tag]) => tag) : []
      const preRollFrames = Math.floor(DEFAULT_PAUSES.preRollMs / FRAME_MS)
      expect(tags.filter((tag) => tag === 1)).toHaveLength(preRollFrames)
      expect(tags.filter((tag) => tag === 2)).toHaveLength(640 / FRAME_MS)
    })

    it("can be configured", () => {
      const pauses = createPauses({
        ...DEFAULT_PAUSES,
        interruptMinSpeechMs: 320,
      })
      pauses.setInterruptGate(true)

      expect(types(feed(pauses, SPEECH, 320))).toEqual(["speechStarted"])
    })

    it("forgets speech that never passed it once off, e.g. the Reply's echo", () => {
      const pauses = createPauses()
      pauses.setInterruptGate(true)
      feed(pauses, SPEECH, 224)
      feed(pauses, QUIET, 64)
      feed(pauses, SPEECH, 224)

      pauses.setInterruptGate(false)

      expect(types(feed(pauses, SPEECH, 160))).toEqual([])
      expect(types(feed(pauses, SPEECH, 96))).toEqual(["speechStarted"])
    })

    it("keeps an Utterance that passed it going once off", () => {
      const pauses = createPauses()
      pauses.setInterruptGate(true)
      feed(pauses, SPEECH, 576)

      pauses.setInterruptGate(false)

      expect(types(feed(pauses, SPEECH, 320))).toEqual([])
      expect(
        types(feed(pauses, QUIET, DEFAULT_PAUSES.endOfTurnPauseMs))
      ).toEqual(["piece", "endOfTurn"])
    })

    it("goes back to the usual gate once off", () => {
      const pauses = createPauses()
      pauses.setInterruptGate(true)
      pauses.setInterruptGate(false)

      expect(types(feed(pauses, SPEECH, 256))).toEqual(["speechStarted"])
    })
  })
})
