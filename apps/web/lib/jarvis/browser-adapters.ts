import { titleSession } from "@/app/sessions/actions"

import { browseViewSchema } from "../browse/view"
import { searchOutcomeSchema, toResultsOnScreen } from "../search/outcome"
import { notifySessionsChanged } from "../sessions/browser-events"
import { ownerLocationIfGranted } from "../weather/owner-location"
import { getWidgetBoard } from "../widgets/browser-board"
import { RESULTS_WIDGET_ID } from "../widgets/catalog"
import {
  SessionGoneError,
  type Brain,
  type BrowseSource,
  type JarvisAdapters,
  type Recorder,
  type Reply,
  type Transcriber,
  type Utterance,
  type Voice,
  type WidgetChanges,
} from "./session"

class HttpError extends Error {
  constructor(
    url: string,
    readonly status: number
  ) {
    super(`${url} failed: ${status}`)
  }
}

async function post(url: string, body: Blob | object): Promise<Response> {
  const response = await fetch(
    url,
    body instanceof Blob
      ? { method: "POST", body }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
  )
  if (!response.ok) throw new HttpError(url, response.status)
  return response
}

function createMediaRecorder(): Recorder {
  let capture: {
    mediaRecorder: MediaRecorder
    chunks: Blob[]
    startedAt: number
  } | null = null

  return {
    async start() {
      // Measured from the press, so waiting on the mic still counts.
      const startedAt = performance.now()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      })
      mediaRecorder.start()
      capture = { mediaRecorder, chunks, startedAt }
    },
    stop() {
      const current = capture
      capture = null
      if (!current) return Promise.reject(new Error("No Utterance in progress"))
      const { mediaRecorder, chunks, startedAt } = current
      return new Promise<Utterance>((resolve) => {
        mediaRecorder.addEventListener("stop", () => {
          mediaRecorder.stream.getTracks().forEach((track) => track.stop())
          resolve({
            audio: new Blob(chunks, { type: mediaRecorder.mimeType }),
            durationMs: performance.now() - startedAt,
          })
        })
        mediaRecorder.stop()
      })
    },
  }
}

const httpTranscriber: Transcriber = {
  async transcribe(audio) {
    const response = await post("/api/transcribe", audio)
    const { text } = (await response.json()) as { text: string }
    return text
  },
}

/**
 * Sends only the Owner's new message: the server owns the Transcript. Also
 * sends the Widget layout with every Turn so Jarvis knows what is Shown, the
 * Results the Results Widget shows while it is Shown, and the Owner's
 * coordinates when the browser already allows it.
 */
const httpBrain: Brain = {
  async reply({ sessionId, text, search: latest }) {
    const widgets = getWidgetBoard().describeLayout()
    const resultsShown = widgets.some(
      ({ id, shown }) => id === RESULTS_WIDGET_ID && shown
    )
    const response = await post("/api/reply", {
      sessionId,
      text,
      widgets,
      coords: await ownerLocationIfGranted(),
      results: latest && resultsShown ? toResultsOnScreen(latest) : undefined,
    }).catch((error: unknown) => {
      // The server doesn't know this Session, e.g. it was deleted.
      if (error instanceof HttpError && error.status === 404) {
        throw new SessionGoneError()
      }
      throw error
    })
    const { search, ...reply } = (await response.json()) as Reply
    // A Search Outcome the client can't read is left out, never shown.
    const parsed = searchOutcomeSchema.optional().safeParse(search)
    if (!parsed.success) {
      console.error("Unreadable Search Outcome", parsed.error)
    }
    // The Turn is saved: the Session is new or moved to the top of the list.
    notifySessionsChanged()
    if (!sessionId) {
      // A separate call after the Reply, so titling never delays it. Done
      // here so a Session the Owner already left still gets its title.
      // Without one, the list keeps showing the Session's date.
      titleSession(reply.sessionId).then(notifySessionsChanged, () => {})
    }
    return parsed.success && parsed.data
      ? { ...reply, search: parsed.data }
      : reply
  },
}

/** The Browse routes; a view the client can't read counts as a failed load. */
const httpBrowse: BrowseSource = {
  async view() {
    const response = await fetch("/api/browse", { cache: "no-store" })
    if (!response.ok) throw new HttpError("/api/browse", response.status)
    return browseViewSchema.nullable().parse(await response.json())
  },
  async stop() {
    const response = await post("/api/browse/stop", {})
    return browseViewSchema.nullable().parse(await response.json())
  },
}

const boardWidgetChanges: WidgetChanges = {
  apply: (changes) => getWidgetBoard().applyChanges(changes),
}

function createAudioVoice(): Voice {
  // Settles the in-flight `speak` call; replaced on every new Reply.
  let finish: (() => void) | null = null
  let audio: HTMLAudioElement | null = null

  function cleanUp() {
    if (audio) {
      audio.pause()
      URL.revokeObjectURL(audio.src)
      audio = null
    }
    finish = null
  }

  return {
    speak(text) {
      return new Promise<void>((resolve, reject) => {
        let settled = false
        const settle = (error?: unknown) => {
          if (settled) return
          settled = true
          cleanUp()
          if (error) reject(error)
          else resolve()
        }
        finish = () => settle()

        void (async () => {
          try {
            const response = await post("/api/speech", { text })
            const blob = await response.blob()
            if (settled) return
            audio = new Audio(URL.createObjectURL(blob))
            audio.addEventListener("ended", () => settle())
            audio.addEventListener("error", () =>
              settle(new Error("Audio playback failed"))
            )
            await audio.play()
          } catch (error) {
            settle(error)
          }
        })()
      })
    },
    stop() {
      finish?.()
    },
  }
}

export function createBrowserAdapters(): JarvisAdapters {
  return {
    recorder: createMediaRecorder(),
    transcriber: httpTranscriber,
    brain: httpBrain,
    voice: createAudioVoice(),
    widgets: boardWidgetChanges,
    browse: httpBrowse,
  }
}
