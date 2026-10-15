import type { MemoryEvent } from "../memory/events"
import { ERRORS, type JarvisState, type TranscriptEntry } from "./session"

/**
 * What the Caption shows: the greeting before the first Turn, or the last
 * Turn, i.e. what Jarvis understood of the Owner, its Reply with any Memory
 * it Remembered or Forgot, and any error.
 */
export type Caption =
  | { kind: "welcome" }
  | {
      kind: "turn"
      owner?: string
      reply?: string
      memoryEvents?: MemoryEvent[]
      error?: string
    }

/**
 * The Caption for the Transcript so far, or null while the next Utterance is
 * being captured. An error after a Reply belongs to a new attempt that never
 * reached the Transcript, e.g. a failed transcription, so it shows alone,
 * unless it's the Reply failing to play, which belongs to that Reply.
 */
export function captionOf(
  transcript: readonly TranscriptEntry[],
  state: JarvisState
): Caption | null {
  if (state === "listening") return null
  if (transcript.length === 0) return { kind: "welcome" }

  const last = transcript.at(-1)!
  const ownerIndex = transcript.map(({ role }) => role).lastIndexOf("owner")
  const turn = ownerIndex === -1 ? [] : transcript.slice(ownerIndex)
  const reply = turn.find(({ role }) => role === "jarvis")
  const error = last.role === "error" ? last.text : undefined

  if (error && reply && error !== ERRORS.voice) return { kind: "turn", error }
  if (error && !turn.includes(last)) return { kind: "turn", error }
  return {
    kind: "turn",
    ...(turn[0] ? { owner: turn[0].text } : {}),
    ...(reply ? { reply: reply.text } : {}),
    ...(reply?.memoryEvents ? { memoryEvents: reply.memoryEvents } : {}),
    ...(error ? { error } : {}),
  }
}
