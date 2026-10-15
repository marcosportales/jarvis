import { isRunning, type BrowseView } from "../browse/view"
import type { MemoryEvent } from "../memory/events"
import type { SearchOutcome } from "../search/outcome"
import type { SavedTurn } from "../sessions/store"
import type { Interrupted } from "../turns/interrupted"
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
  /** On an Interrupted Reply: cut short, or never spoken. Kept whole. */
  interrupted?: Interrupted
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
  /** Hands-free is on: every stretch of speech Jarvis hears is an Utterance. */
  handsFree: boolean
  /** The mic is open: Hands-free is on or a Push-to-talk hold is going on. */
  micOpen: boolean
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

/** A stretch of an Utterance's audio, ready to be Transcribed. */
export type Piece = { audio: Blob; durationMs: number }

/**
 * A captured Utterance: a hold's pieces, Transcribed once it is long enough,
 * or under Hands-free their texts, each piece having been sent to the
 * Transcriber as soon as it was ready.
 */
type Captured = { pieces: Piece[]; texts: Promise<string>[] }

/** The pieces' texts as one message, in order. */
function joinTexts(texts: string[]) {
  return texts
    .map((text) => text.trim())
    .filter(Boolean)
    .join(" ")
}

/** What the Listener reports while it captures an Utterance. */
export type ListenerEvents = {
  /** Under Hands-free, the Owner started speaking: an Utterance begins. */
  speechStarted(): void
  pieceReady(audio: Blob, durationMs: number): void
  /** The Utterance is over: no more pieces of it will come. */
  endOfTurn(): void
  /** Capturing the Utterance broke; none of it will come. */
  failed(error: unknown): void
}

/** The mic, capturing the Owner's Utterances. */
export interface Listener {
  /** Gets the mic; rejects when it is denied or missing. */
  open(): Promise<void>
  /** Releases the mic, dropping whatever was being captured. */
  close(): void
  /** A Push-to-talk hold starts: capture until `holdEnd`. */
  holdStart(): void
  /** The hold is released: its audio comes as a last piece, then end of turn. */
  holdEnd(): void
  /** Reports the Listener's events; returns a function that stops them. */
  listen(events: ListenerEvents): () => void
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
  /** The Session's previous Reply was an Interrupted Reply. */
  interrupted?: Interrupted
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
  /** Stops the Reply; returns the share of it played, from 0 to 1. */
  stop(): number
}

/** The server's current Browse Task. */
export interface BrowseSource {
  /** Null with no Browse Task; throws when it can't be loaded. */
  view(): Promise<BrowseView | null>
  /** Stops it and gives the view afterwards; throws when it won't stop. */
  stop(): Promise<BrowseView | null>
}

/**
 * The short UI sounds, played locally:
 * - `handsFreeOn` / `handsFreeOff`: Hands-free turned on or off, from any source.
 * - `turnSent`: a soft acknowledgement that a Turn went to the Brain.
 * - `speechQueued`: speech heard while Thinking was queued as the next Turn.
 */
export type Cue = "handsFreeOn" | "handsFreeOff" | "turnSent" | "speechQueued"

export interface Cues {
  /** Starts the cue and returns at once; a cue that can't play is skipped. */
  play(cue: Cue): void
}

export type JarvisAdapters = {
  listener: Listener
  transcriber: Transcriber
  brain: Brain
  voice: Voice
  widgets: WidgetChanges
  browse: BrowseSource
  cues: Cues
}

/** One live Session on the page: its Jarvis State, Transcript and Turns. */
export type JarvisSession = ReturnType<typeof createJarvisSession>

/** A Session saved earlier, to resume where it was left. */
export type SavedSession = { sessionId: string; turns: SavedTurn[] }

export function createJarvisSession(
  {
    listener,
    transcriber,
    brain,
    voice,
    widgets,
    browse,
    cues,
  }: JarvisAdapters,
  saved?: SavedSession
) {
  let nextId = 0
  let snapshot: JarvisSnapshot = {
    state: "idle",
    transcript: (saved?.turns ?? []).flatMap(
      ({ owner, reply, memoryEvents, interrupted }): TranscriptEntry[] => [
        { id: nextId++, role: "owner", text: owner },
        {
          id: nextId++,
          role: "jarvis",
          text: reply,
          ...(memoryEvents ? { memoryEvents } : {}),
          ...(interrupted ? { interrupted } : {}),
        },
      ]
    ),
    hint: null,
    sessionId: saved?.sessionId ?? null,
    gone: false,
    search: null,
    browse: null,
    browseJustEnded: false,
    handsFree: false,
    micOpen: false,
  }
  // Bumped whenever a Turn is cut short, so its late callbacks are ignored.
  let generation = 0
  // How the last Reply was interrupted, until a Turn telling the server is done.
  let lastReplyInterrupted: Interrupted | null = null
  // Resolves to whether the Listener actually got the mic for the Utterance.
  let micOpened: Promise<boolean> = Promise.resolve(false)
  // A Push-to-talk hold is going on, from its press until its mic is done.
  let holding = false
  // The Utterance being captured: what it has so far, and how it ends.
  let capture: {
    captured: Captured
    /** Under Hands-free: each piece is Transcribed as soon as it's ready. */
    transcribeAtOnce: boolean
    end: (captured: Captured) => void
    fail: (error: unknown) => void
  } | null = null
  // Settles with the captured Utterance at its end of turn.
  let utteranceEnded: Promise<Captured> = Promise.resolve({
    pieces: [],
    texts: [],
  })
  const listeners = new Set<() => void>()
  // Polling the Browse Task: on while watching, one load at a time.
  let watchingBrowse = false
  let browseTimer: ReturnType<typeof setTimeout> | undefined
  // Bumped by every load and by teardown, so a late load changes nothing.
  let browseLoad = 0

  const stopListening = listener.listen({
    speechStarted() {
      if (!snapshot.handsFree || snapshot.state !== "idle" || capture) return
      update({ state: "listening", hint: null })
      startCapture({ transcribeAtOnce: true })
      void takeHandsFreeUtterance(utteranceEnded)
    },
    pieceReady(audio, durationMs) {
      if (!capture) return
      if (!capture.transcribeAtOnce) {
        return void capture.captured.pieces.push({ audio, durationMs })
      }
      // Sent at once, so its audio is let go as soon as its text is back.
      const text = transcriber.transcribe(audio)
      // Its failure is reported at end of turn, not as an unhandled one.
      text.catch(() => {})
      capture.captured.texts.push(text)
    },
    endOfTurn() {
      const ended = capture
      capture = null
      ended?.end(ended.captured)
    },
    failed(error) {
      const ended = capture
      capture = null
      ended?.fail(error)
    },
  })

  /** Starts gathering the pieces of a new Utterance. */
  function startCapture({ transcribeAtOnce = false } = {}) {
    utteranceEnded = new Promise<Captured>((end, fail) => {
      capture = {
        captured: { pieces: [], texts: [] },
        transcribeAtOnce,
        end,
        fail,
      }
    })
    // Its failure is reported on release, not as an unhandled rejection.
    utteranceEnded.catch(() => {})
  }

  function update(patch: Partial<JarvisSnapshot>) {
    snapshot = { ...snapshot, ...patch }
    listeners.forEach((listener) => listener())
  }

  /** Hands-free or a hold changed, and with them whether the mic is open. */
  function updateMic(
    patch: Partial<JarvisSnapshot> & { holding?: boolean } = {}
  ) {
    const { holding: held = holding, ...rest } = patch
    holding = held
    const handsFree = rest.handsFree ?? snapshot.handsFree
    const toggled = handsFree !== snapshot.handsFree
    update({ ...rest, micOpen: handsFree || holding })
    // Every toggle, whatever caused it, so a tap made without looking is heard.
    if (toggled) cues.play(handsFree ? "handsFreeOn" : "handsFreeOff")
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

  /**
   * Marks the last Reply as an Interrupted Reply, in the Transcript and on
   * the next Turn's request, so the server saves it and tells Jarvis.
   */
  function markLastReplyInterrupted(interrupted: Interrupted) {
    const index = snapshot.transcript
      .map(({ role }) => role)
      .lastIndexOf("jarvis")
    if (index === -1) return
    lastReplyInterrupted = interrupted
    update({
      transcript: snapshot.transcript.map((entry, at) =>
        at === index ? { ...entry, interrupted } : entry
      ),
    })
  }

  /** Stops a Turn whose Jarvis State now belongs to a newer Turn or none. */
  function ensureCurrent(turnGeneration: number) {
    if (turnGeneration !== generation) throw new TurnSuperseded()
  }

  async function reply(message: string, turnGeneration: number) {
    const { sessionId, search: latest } = snapshot
    const interrupted = lastReplyInterrupted
    // Played here, not on Thinking: an Utterance dropped there was never sent.
    cues.play("turnSent")
    const { text, widgetChanges, memoryEvents, search, ...saved } =
      await orFail(
        brain.reply({
          ...(sessionId ? { sessionId } : {}),
          text: message,
          ...(latest ? { search: latest } : {}),
          ...(interrupted ? { interrupted } : {}),
        }),
        ERRORS.reply
      )
    // The server has the mark now; a failed Turn sends it again next time.
    if (lastReplyInterrupted === interrupted) lastReplyInterrupted = null
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

  /**
   * A hands-free Utterance: Thinking from its end of turn, then sent to the
   * Brain once every piece's text is back. One with no words is dropped
   * without a hint: under Hands-free, noises are not the Owner's mistake.
   */
  async function takeHandsFreeUtterance(ended: Promise<Captured>) {
    const turnGeneration = generation
    await runTurn(turnGeneration, async () => {
      const { texts } = await orFail(ended, ERRORS.microphone)
      ensureCurrent(turnGeneration)
      setState("thinking")
      const text = joinTexts(
        await orFail(Promise.all(texts), ERRORS.transcription)
      )
      ensureCurrent(turnGeneration)
      if (!text) return setState("idle")
      append("owner", text)
      await reply(text, turnGeneration)
    })
  }

  // A new Turn can only start when Jarvis isn't Listening or Thinking.
  function canStartTurn() {
    return snapshot.state === "idle" || snapshot.state === "speaking"
  }

  function interruptSpeaking() {
    if (snapshot.state !== "speaking") return
    generation++
    markLastReplyInterrupted({ cut: voice.stop() })
  }

  /** Gets the mic; on failure the inline error shows and the mic is off. */
  function openMic() {
    micOpened = listener.open().then(
      () => true,
      () => {
        // Turned off meanwhile: the Owner no longer waits on the mic.
        if (!holding && !snapshot.handsFree) return false
        // A hold waiting on the mic ends here, before it is released.
        const held = holding
        if (held) capture = null
        append("error", ERRORS.microphone)
        updateMic({
          holding: false,
          handsFree: false,
          ...(held ? { state: "idle" } : {}),
        })
        return false
      }
    )
  }

  function setHandsFree(on: boolean) {
    if (on === snapshot.handsFree) return
    updateMic({ handsFree: on })
    if (on) {
      // A hold going on already has the mic.
      if (!holding) openMic()
      return
    }
    // The Utterance being heard is dropped; a hold's is still sent.
    if (capture?.transcribeAtOnce) {
      const dropped = capture
      capture = null
      generation++
      dropped.fail(new TurnSuperseded())
      setState("idle")
    }
    // A hold keeps the mic until its release.
    if (!holding) listener.close()
  }

  return {
    getSnapshot: () => snapshot,
    setHandsFree,
    /** The Owner tapped the Orb or Space: Hands-free goes on or off. */
    tap() {
      setHandsFree(!snapshot.handsFree)
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    pressPushToTalk() {
      if (!canStartTurn()) return
      interruptSpeaking()
      updateMic({ holding: true, state: "listening", hint: null })
      startCapture()
      listener.holdStart()
      // Under Hands-free the mic is already open.
      if (!snapshot.handsFree) openMic()
    },
    async releasePushToTalk() {
      if (snapshot.state !== "listening") return
      const turnGeneration = generation
      setState("thinking")
      if (!(await micOpened) || turnGeneration !== generation) return
      const ended = utteranceEnded
      listener.holdEnd()
      await runTurn(turnGeneration, async () => {
        const { pieces } = await orFail(
          ended.finally(() => {
            // With Hands-free off, the mic closes once the hold is captured.
            if (!snapshot.handsFree) listener.close()
            updateMic({ holding: false })
          }),
          ERRORS.microphone
        )
        ensureCurrent(turnGeneration)
        const durationMs = pieces.reduce(
          (total, piece) => total + piece.durationMs,
          0
        )
        if (durationMs < MIN_UTTERANCE_MS) {
          return discardUtterance()
        }
        const texts = await orFail(
          Promise.all(
            pieces.map((piece) => transcriber.transcribe(piece.audio))
          ),
          ERRORS.transcription
        )
        const text = joinTexts(texts)
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
      stopListening()
      capture = null
      if (state === "speaking") voice.stop()
      // Releases the microphone, even mid-capture; the Utterance is never sent.
      void micOpened.then((opened) => {
        if (opened) listener.close()
      })
      updateMic({
        holding: false,
        state: "idle",
        hint: null,
        handsFree: false,
      })
    },
  }
}
