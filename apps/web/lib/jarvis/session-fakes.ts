/**
 * A Jarvis Session over fake adapters, for tests: what it Spoke, Transcribed
 * and asked the Brain, in order, with the Brain and the Voice answering only
 * when told to.
 */

import {
  createJarvisSession,
  type Brain,
  type BrowseSource,
  type Cue,
  type Cues,
  type JarvisState,
  type Listener,
  type ListenerEvents,
  type Reply,
  type Transcriber,
  type Voice,
  type WidgetChanges,
} from "./session"
import type { BrowseView } from "../browse/view"
import type { MemoryEvent } from "../memory/events"
import type { WidgetChange } from "../widgets/changes"

export type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * A Listener whose events a test fires by hand. Unless `manual`, releasing a
 * hold yields it at once as one piece of `durationMs`, then end of turn.
 */
export function fakeListener(
  options: { durationMs?: number; openError?: unknown; manual?: boolean } = {}
) {
  const calls: string[] = []
  const subscribers = new Set<ListenerEvents>()
  const fire: ListenerEvents = {
    speechStarted: () =>
      subscribers.forEach((events) => events.speechStarted()),
    pieceReady: (audio, durationMs) =>
      subscribers.forEach((events) => events.pieceReady(audio, durationMs)),
    endOfTurn: () => subscribers.forEach((events) => events.endOfTurn()),
    failed: (error) => subscribers.forEach((events) => events.failed(error)),
  }
  const audio = (content = "audio") =>
    new Blob([content], { type: "audio/webm" })
  const listener: Listener = {
    async open() {
      calls.push("open")
      if (options.openError) throw options.openError
    },
    close() {
      calls.push("close")
    },
    holdStart() {
      calls.push("holdStart")
    },
    holdEnd() {
      calls.push("holdEnd")
      if (options.manual) return
      fire.pieceReady(audio(), options.durationMs ?? 2000)
      fire.endOfTurn()
    },
    listen(events) {
      subscribers.add(events)
      return () => {
        subscribers.delete(events)
      }
    },
  }
  return { listener, calls, fire, audio }
}

/** Hears `text`, or what `text` makes of the audio, or fails with it. */
export function fakeTranscriber(
  text: string | Error | ((audio: Blob) => Promise<string>) = "Hola Jarvis"
) {
  const calls: Blob[] = []
  const transcriber: Transcriber = {
    async transcribe(audio) {
      calls.push(audio)
      if (text instanceof Error) throw text
      return typeof text === "function" ? text(audio) : text
    },
  }
  return { transcriber, calls }
}

export function fakeBrain() {
  const calls: Parameters<Brain["reply"]>[0][] = []
  const pending: Deferred<Awaited<ReturnType<Brain["reply"]>>>[] = []
  const brain: Brain = {
    reply(request) {
      calls.push(request)
      const d = deferred<Awaited<ReturnType<Brain["reply"]>>>()
      pending.push(d)
      return d.promise
    },
  }
  return {
    brain,
    calls,
    answer: (
      text: string,
      widgetChanges: WidgetChange[] = [],
      sessionId = "session-1",
      memoryEvents: MemoryEvent[] = []
    ) =>
      pending
        .shift()!
        .resolve({ sessionId, text, widgetChanges, memoryEvents }),
    /** Answers with a whole Reply, e.g. one carrying a Search Outcome. */
    reply: (reply: Partial<Reply> & { text: string }) =>
      pending.shift()!.resolve({
        sessionId: "session-1",
        widgetChanges: [],
        memoryEvents: [],
        ...reply,
      }),
    fail: (error: unknown) => pending.shift()!.reject(error),
  }
}

/**
 * Serves Browse Task views in order, the last one repeating; an Error in
 * the list fails that load.
 */
export function fakeBrowse(views: (BrowseView | null | Error)[] = [null]) {
  let loads = 0
  const stops: number[] = []
  let stopped: BrowseView | null = null
  const browse: BrowseSource = {
    async view() {
      const next = views[Math.min(loads++, views.length - 1)]
      if (next instanceof Error) throw next
      return next ?? null
    },
    async stop() {
      stops.push(loads)
      return stopped
    },
  }
  return {
    browse,
    loads: () => loads,
    stops,
    /** What `stop()` answers. */
    stopsWith: (view: BrowseView) => (stopped = view),
  }
}

/** Shared by the fakes so tests can check what happened in which order. */
export type Events = string[]

export function fakeWidgets(events: Events) {
  const applied: WidgetChange[][] = []
  const widgets: WidgetChanges = {
    apply(changes) {
      events.push("apply widget changes")
      applied.push([...changes])
    },
  }
  return { widgets, applied }
}

export function fakeVoice(events: Events = []) {
  const spoken: string[] = []
  let stopped = 0
  // The share of the clip played by the time it is stopped.
  let played = 0.5
  const pending: Deferred<void>[] = []
  const voice: Voice = {
    speak(text) {
      events.push("speak")
      spoken.push(text)
      const d = deferred<void>()
      pending.push(d)
      return d.promise
    },
    stop() {
      stopped++
      pending.shift()?.resolve()
      return played
    },
  }
  return {
    voice,
    spoken,
    stopped: () => stopped,
    /** Stopping the Reply finds this share of it played. */
    playsUpTo: (share: number) => (played = share),
    finish: () => pending.shift()!.resolve(),
    fail: (error: unknown) => pending.shift()!.reject(error),
  }
}

/** Remembers which cue was asked for, in order; plays nothing. */
export function fakeCues() {
  const played: Cue[] = []
  const cues: Cues = {
    play(cue) {
      played.push(cue)
    },
  }
  return { cues, played }
}

export function setup(
  options: {
    listener?: ReturnType<typeof fakeListener>
    transcriber?: ReturnType<typeof fakeTranscriber>
    saved?: Parameters<typeof createJarvisSession>[1]
    browse?: ReturnType<typeof fakeBrowse>
  } = {}
) {
  const listener = options.listener ?? fakeListener()
  const transcriber = options.transcriber ?? fakeTranscriber()
  const events: Events = []
  const brain = fakeBrain()
  const voice = fakeVoice(events)
  const widgets = fakeWidgets(events)
  const browse = options.browse ?? fakeBrowse()
  const cues = fakeCues()
  const session = createJarvisSession(
    {
      listener: listener.listener,
      transcriber: transcriber.transcriber,
      brain: brain.brain,
      voice: voice.voice,
      widgets: widgets.widgets,
      browse: browse.browse,
      cues: cues.cues,
    },
    options.saved
  )
  const states: JarvisState[] = [session.getSnapshot().state]
  session.subscribe(() => {
    const { state } = session.getSnapshot()
    if (states.at(-1) !== state) states.push(state)
  })
  const transcript = () =>
    session.getSnapshot().transcript.map(({ role, text }) => ({ role, text }))
  return {
    session,
    listener,
    transcriber,
    brain,
    voice,
    widgets,
    browse,
    cues,
    events,
    states,
    transcript,
  }
}
