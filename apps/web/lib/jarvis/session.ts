import type { WidgetChange } from "../widgets/changes"

export type JarvisState = "idle" | "listening" | "thinking" | "speaking"

/** One line of the Transcript as the Brain sees it. */
export type TranscriptLine = { role: "owner" | "jarvis"; text: string }

export type TranscriptEntry = {
  id: number
  /** `error` entries are shown inline but never sent to the Brain. */
  role: TranscriptLine["role"] | "error"
  text: string
}

export type JarvisSnapshot = {
  state: JarvisState
  transcript: TranscriptEntry[]
  /** A transient nudge, e.g. when an Utterance is discarded. */
  hint: string | null
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

/** What the Brain says, and what it did to the Widgets while deciding. */
export type Reply = { text: string; widgetChanges: WidgetChange[] }

export interface Brain {
  reply(lines: TranscriptLine[]): Promise<Reply>
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

export function createJarvisSession({
  recorder,
  transcriber,
  brain,
  voice,
  widgets,
}: JarvisAdapters) {
  let snapshot: JarvisSnapshot = {
    state: "idle",
    transcript: [],
    hint: null,
  }
  let nextId = 0
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

  function append(role: TranscriptEntry["role"], text: string) {
    update({
      transcript: [...snapshot.transcript, { id: nextId++, role, text }],
    })
  }

  async function reply() {
    const lines = snapshot.transcript.flatMap(({ role, text }) =>
      role === "error" ? [] : [{ role, text }]
    )
    const { text, widgetChanges } = await orFail(
      brain.reply(lines),
      ERRORS.reply
    )
    // Before Speaking, so the screen matches what Jarvis is about to say.
    widgets.apply(widgetChanges)
    append("jarvis", text)
    setState("speaking")
    const current = generation
    const played = await voice.speak(text).then(
      () => true,
      () => false
    )
    // Interrupted: a newer Turn now owns the Jarvis State.
    if (current !== generation) return
    if (!played) throw new TurnFailed(ERRORS.voice)
    setState("idle")
  }

  function discardUtterance() {
    update({ state: "idle", hint: DISCARDED_UTTERANCE_HINT })
  }

  async function runTurn(work: () => Promise<void>) {
    try {
      await work()
    } catch (error) {
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
      setState("thinking")
      if (!(await micStarted)) return
      await runTurn(async () => {
        const utterance = await orFail(recorder.stop(), ERRORS.microphone)
        if (utterance.durationMs < MIN_UTTERANCE_MS) {
          return discardUtterance()
        }
        const text = (
          await orFail(
            transcriber.transcribe(utterance.audio),
            ERRORS.transcription
          )
        ).trim()
        if (!text) {
          return discardUtterance()
        }
        append("owner", text)
        await reply()
      })
    },
    async sendTypedMessage(text: string) {
      if (!canStartTurn()) return
      interruptSpeaking()
      update({ hint: null })
      append("owner", text)
      setState("thinking")
      await runTurn(reply)
    },
  }
}
