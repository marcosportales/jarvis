import { isRunning, type BrowseView } from "../browse/view"
import type { MemoryEvent } from "../memory/events"
import type { SearchOutcome } from "../search/outcome"
import type { SavedTurn } from "../sessions/store"
import { BROWSER_WIDGET_ID } from "../widgets/catalog"
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
  /**
   * The latest Search Outcome, for the Results Widget. Kept in memory only:
   * replaced by a Reply that searched, kept by one that didn't, and gone on
   * reload.
   */
  search: SearchOutcome | null
  /**
   * The current Browse Task, for the Browser Widget; null with none. It lives
   * on the server, so every Session shows the same one.
   */
  browse: BrowseView | null
  /** This page saw the Browse Task end, so the Browser Widget highlights it. */
  browseJustEnded: boolean
}

export const MIN_UTTERANCE_MS = 500

/** How often a running Browse Task is checked on. */
export const BROWSE_POLL_MS = 4_000
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

/**
 * The Owner's new message, in the Session it belongs to (none yet if new),
 * with the latest Search Outcome if there is one, for Jarvis to talk about.
 */
export type ReplyRequest = {
  sessionId?: string
  text: string
  search?: SearchOutcome
}

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

/** The server's current Browse Task. */
export interface BrowseSource {
  /** Null with no Browse Task; throws when it can't be loaded. */
  view(): Promise<BrowseView | null>
  /** Stops it and gives the view afterwards; throws when it won't stop. */
  stop(): Promise<BrowseView | null>
}

export type JarvisAdapters = {
  recorder: Recorder
  transcriber: Transcriber
  brain: Brain
  voice: Voice
  widgets: WidgetChanges
  browse: BrowseSource
}

/** One live Session on the page: its Jarvis State, Transcript and Turns. */
export type JarvisSession = ReturnType<typeof createJarvisSession>

/** A Session saved earlier, to resume where it was left. */
export type SavedSession = { sessionId: string; turns: SavedTurn[] }

export function createJarvisSession(
  { recorder, transcriber, brain, voice, widgets, browse }: JarvisAdapters,
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
    search: null,
    browse: null,
    browseJustEnded: false,
  }
  // Bumped whenever a Turn is cut short, so its late callbacks are ignored.
  let generation = 0
  // Resolves to whether the Recorder actually started capturing the Utterance.
  let micStarted: Promise<boolean> = Promise.resolve(false)
  const listeners = new Set<() => void>()
  // Polling the Browse Task: on while watching, one load at a time.
  let watchingBrowse = false
  let browseTimer: ReturnType<typeof setTimeout> | undefined
  // Bumped by every load and by teardown, so a late load changes nothing.
  let browseLoad = 0

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
    const { sessionId, search: latest } = snapshot
    const { text, widgetChanges, memoryEvents, search, ...saved } =
      await orFail(
        brain.reply({
          ...(sessionId ? { sessionId } : {}),
          text: message,
          ...(latest ? { search: latest } : {}),
        }),
        ERRORS.reply
      )
    // The server saved the Turn in its Session anyway; just don't show it.
    ensureCurrent(turnGeneration)
    update({
      sessionId: saved.sessionId,
      ...(search ? { search } : {}),
    })
    // Before Speaking, so the screen matches what Jarvis is about to say.
    widgets.apply(widgetChanges)
    // The Turn may have started or stopped a Browse Task.
    void loadBrowse()
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

  /**
   * Shows a new Browse Task view. One that just ended on its own Shows the
   * Browser Widget, Hidden or not, and highlights it; that is the only cue.
   * A stopped one doesn't: the Owner stopped it, by voice or in the Widget.
   */
  function showBrowse(view: BrowseView | null) {
    const ended =
      isRunning(snapshot.browse) &&
      !isRunning(view) &&
      view?.status !== "stopped"
    if (ended) widgets.apply([{ type: "show", id: BROWSER_WIDGET_ID }])
    update({
      browse: view,
      browseJustEnded: ended || (!isRunning(view) && snapshot.browseJustEnded),
    })
  }

  /** Loads the Browse Task view, then again later while it's running. */
  async function loadBrowse() {
    if (!watchingBrowse) return
    clearTimeout(browseTimer)
    const load = ++browseLoad
    try {
      const view = await browse.view()
      if (load !== browseLoad) return
      showBrowse(view)
    } catch (error) {
      if (load !== browseLoad) return
      // Offline for a moment: keep the last view and try again.
      console.error("Loading the Browse Task failed", error)
    }
    pollBrowseLater()
  }

  function pollBrowseLater() {
    if (isRunning(snapshot.browse)) {
      browseTimer = setTimeout(() => void loadBrowse(), BROWSE_POLL_MS)
    }
  }

  function stopWatchingBrowse() {
    watchingBrowse = false
    browseLoad++
    clearTimeout(browseTimer)
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
     * Follows the server's Browse Task: loads it now, and keeps it up to
     * date while it runs, whether or not the Browser Widget is Shown.
     */
    watchBrowse() {
      watchingBrowse = true
      void loadBrowse()
    },
    /**
     * The Owner pressed stop in the Browser Widget. Not a cue: they ended it
     * themselves. Resolves to whether it stopped.
     */
    async stopBrowse() {
      const load = ++browseLoad
      clearTimeout(browseTimer)
      try {
        const view = await browse.stop()
        if (load === browseLoad)
          update({ browse: view, browseJustEnded: false })
        return true
      } catch (error) {
        console.error("Stopping the Browse Task failed", error)
        return false
      } finally {
        // Still running if it wouldn't stop.
        if (load === browseLoad && watchingBrowse) pollBrowseLater()
      }
    },
    /**
     * Leaves this Session, e.g. when the Owner opens another one: the Voice
     * stops at once and any late callback of the current Turn changes nothing.
     */
    teardown() {
      const { state } = snapshot
      generation++
      stopWatchingBrowse()
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
