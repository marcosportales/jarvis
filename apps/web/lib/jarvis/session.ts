import type { MemoryEvent } from "../memory/events"
import type { SearchOutcome } from "../search/outcome"
import type { SavedTurn } from "../sessions/store"
import type { WidgetChange } from "../widgets/changes"

export type JarvisState = "idle" | "listening" | "thinking" | "speaking"

export type TranscriptEntry = {
  id: number
  /** `error` entries are shown inline but never sent or saved. */
  role: "owner" | "jarvis" | "error"
  text: string
  /** On a Reply: what Jarvis Remembered or Forgot. Shown, never spoken. */
  memoryEvents?: MemoryEvent[]
}

export type JarvisSnapshot = {
  state: JarvisState
  transcript: TranscriptEntry[]
  /** A transient nudge, e.g. when an Utterance is discarded. */
  hint: string | null
  /** Null until the server saves this Session's first Turn. */
  sessionId: string | null
  /** The server no longer has this Session, e.g. it was deleted. */
  gone: boolean
}

export const MIN_UTTERANCE_MS = 500
export const DISCARDED_UTTERANCE_HINT = "No te entendí"

export const ERRORS = {
  microphone:
    "No pude acceder al micrófono. Revisa los permisos del navegador; puedes seguir escribiendo.",
  transcription: "No pude transcribir lo que dijiste. Inténtalo de nuevo.",
  reply: "No pude obtener una respuesta. Inténtalo de nuevo.",
  voice: "No pude reproducir la respuesta en voz alta.",
} as const

class TurnFailed extends Error {}

/** A Turn that was cut short; whatever it was waiting for is dropped. */
class TurnSuperseded extends Error {}

/** Re-labels an adapter failure with the inline error the Owner will see. */
async function orFail<T>(work: Promise<T>, message: string): Promise<T> {
  try {
    return await work
  } catch (cause) {
    throw new TurnFailed(message, { cause })
  }
}

export type Utterance = { audio: Blob; durationMs: number }

export interface Recorder {
  start(): Promise<void>
  stop(): Promise<Utterance>
}

export interface Transcriber {
  transcribe(audio: Blob): Promise<string>
}

/** The Owner's new message, in the Session it belongs to (none yet if new). */
export type ReplyRequest = { sessionId?: string; text: string }

/**
 * What the Brain says, the Session the Turn was saved in, and what it did to
 * the Widgets and to its Memory while deciding, plus what it found if it
 * searched.
 */
export type Reply = {
  sessionId: string
  text: string
  widgetChanges: WidgetChange[]
  memoryEvents: MemoryEvent[]
  search?: SearchOutcome
}

/** Thrown by the Brain when the server doesn't know the Session. */
export class SessionGoneError extends Error {}

export interface Brain {
  reply(request: ReplyRequest): Promise<Reply>
}

/** The Widget Board, as far as the Session needs it. */
export interface WidgetChanges {
  apply(changes: readonly WidgetChange[]): void
}

export interface Voice {
  /** Plays the Reply; settles when playback ends or is stopped. */
  speak(text: string): Promise<void>
  stop(): void
}

export type JarvisAdapters = {
  recorder: Recorder
  transcriber: Transcriber
  brain: Brain
  voice: Voice
  widgets: WidgetChanges
}

/** A Session saved earlier, to resume where it was left. */
export type SavedSession = { sessionId: string; turns: SavedTurn[] }

export function createJarvisSession(
  { recorder, transcriber, brain, voice, widgets }: JarvisAdapters,
  saved?: SavedSession
) {
  let nextId = 0
  let snapshot: JarvisSnapshot = {
    state: "idle",
    transcript: (saved?.turns ?? []).flatMap(
      ({ owner, reply, memoryEvents }): TranscriptEntry[] => [
        { id: nextId++, role: "owner", text: owner },
        { id: nextId++, role: "jarvis", text: reply, memoryEvents },
      ]
    ),
    hint: null,
    sessionId: saved?.sessionId ?? null,
    gone: false,
  }
  // Bumped whenever a Turn is cut short, so its late callbacks are ignored.
  let generation = 0
  // Resolves to whether the Recorder actually started capturing the Utterance.
  let micStarted: Promise<boolean> = Promise.resolve(false)
  const listeners = new Set<() => void>()

  function update(patch: Partial<JarvisSnapshot>) {
    snapshot = { ...snapshot, ...patch }
    listeners.forEach((listener) => listener())
  }

  function setState(state: JarvisState) {
    update({ state })
  }

  function append(
    role: TranscriptEntry["role"],
    text: string,
    memoryEvents?: MemoryEvent[]
  ) {
    const entry: TranscriptEntry = { id: nextId++, role, text }
    if (memoryEvents?.length) entry.memoryEvents = memoryEvents
    update({ transcript: [...snapshot.transcript, entry] })
  }

  /** Stops a Turn whose Jarvis State now belongs to a newer Turn or none. */
  function ensureCurrent(turnGeneration: number) {
    if (turnGeneration !== generation) throw new TurnSuperseded()
  }

  async function reply(message: string, turnGeneration: number) {
    const { sessionId } = snapshot
    const { text, widgetChanges, memoryEvents, ...saved } = await orFail(
      brain.reply(sessionId ? { sessionId, text: message } : { text: message }),
      ERRORS.reply
    )
    // The server saved the Turn in its Session anyway; just don't show it.
    ensureCurrent(turnGeneration)
    update({ sessionId: saved.sessionId })
    // Before Speaking, so the screen matches what Jarvis is about to say.
    widgets.apply(widgetChanges)
    append("jarvis", text, memoryEvents)
    setState("speaking")
    const played = await voice.speak(text).then(
      () => true,
      () => false
    )
    // Interrupted: a newer Turn now owns the Jarvis State.
    if (turnGeneration !== generation) return
    if (!played) throw new TurnFailed(ERRORS.voice)
    setState("idle")
  }

  function discardUtterance() {
    update({ state: "idle", hint: DISCARDED_UTTERANCE_HINT })
  }

  async function runTurn(turnGeneration: number, work: () => Promise<void>) {
    try {
      await work()
    } catch (error) {
      // Cut short: its late failure is no longer the Owner's concern.
      if (turnGeneration !== generation) return
      if (
        error instanceof TurnFailed &&
        error.cause instanceof SessionGoneError
      ) {
        return update({ state: "idle", gone: true })
      }
      if (!(error instanceof TurnFailed)) throw error
      append("error", error.message)
      setState("idle")
    }
  }

  // A new Turn can only start when Jarvis isn't Listening or Thinking.
  function canStartTurn() {
    return snapshot.state === "idle" || snapshot.state === "speaking"
  }

  function interruptSpeaking() {
    if (snapshot.state !== "speaking") return
    generation++
    voice.stop()
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    pressPushToTalk() {
      if (!canStartTurn()) return
      interruptSpeaking()
      update({ state: "listening", hint: null })
      micStarted = recorder.start().then(
        () => true,
        () => {
          append("error", ERRORS.microphone)
          setState("idle")
          return false
        }
      )
    },
    async releasePushToTalk() {
      if (snapshot.state !== "listening") return
      const turnGeneration = generation
      setState("thinking")
      if (!(await micStarted) || turnGeneration !== generation) return
      await runTurn(turnGeneration, async () => {
        const utterance = await orFail(recorder.stop(), ERRORS.microphone)
        ensureCurrent(turnGeneration)
        if (utterance.durationMs < MIN_UTTERANCE_MS) {
          return discardUtterance()
        }
        const text = (
          await orFail(
            transcriber.transcribe(utterance.audio),
            ERRORS.transcription
          )
        ).trim()
        ensureCurrent(turnGeneration)
        if (!text) {
          return discardUtterance()
        }
        append("owner", text)
        await reply(text, turnGeneration)
      })
    },
    async sendTypedMessage(text: string) {
      if (!canStartTurn()) return
      interruptSpeaking()
      update({ hint: null })
      append("owner", text)
      setState("thinking")
      const turnGeneration = generation
      await runTurn(turnGeneration, () => reply(text, turnGeneration))
    },
    /**
     * Leaves this Session, e.g. when the Owner opens another one: the Voice
     * stops at once and any late callback of the current Turn changes nothing.
     */
    teardown() {
      const { state } = snapshot
      generation++
      if (state === "speaking") voice.stop()
      if (state === "listening") {
        // Releases the microphone; the Utterance is never sent.
        void micStarted.then(async (started) => {
          if (started) await recorder.stop().catch(() => {})
        })
      }
      update({ state: "idle", hint: null })
    },
  }
}
