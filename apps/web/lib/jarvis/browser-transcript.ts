import type { TranscriptEntry } from "./session"

export type ShownTranscript = {
  entries: readonly TranscriptEntry[]
  /** Sends a typed message as the Owner's next Turn. */
  send(text: string): void
  /** The Owner asked to type and the text box hasn't taken focus yet. */
  typingRequested: boolean
}

/**
 * What the Transcript Widget shows: the open Session's Transcript and how to
 * type into it, which the Jarvis page hands over whenever they change. One
 * per tab. Browser only.
 */
let shown: ShownTranscript = {
  entries: [],
  send: () => {},
  typingRequested: false,
}
const listeners = new Set<() => void>()

function update(change: Partial<ShownTranscript>) {
  shown = { ...shown, ...change }
  listeners.forEach((listener) => listener())
}

export const shownTranscript = {
  get: () => shown,
  set({ entries, send }: Pick<ShownTranscript, "entries" | "send">) {
    if (entries === shown.entries && send === shown.send) return
    update({ entries, send })
  },
  /** The Owner asked to type; the Transcript Widget focuses its text box. */
  requestTyping: () => update({ typingRequested: true }),
  /** The text box took focus. */
  typingHandled() {
    if (shown.typingRequested) update({ typingRequested: false })
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
