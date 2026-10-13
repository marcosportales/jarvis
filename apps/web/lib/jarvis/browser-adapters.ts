import type {
  Brain,
  JarvisAdapters,
  Recorder,
  Transcriber,
  Utterance,
  Voice,
} from "./session"

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
  if (!response.ok) throw new Error(`${url} failed: ${response.status}`)
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

const httpBrain: Brain = {
  async reply(lines) {
    const response = await post("/api/reply", { lines })
    const { text } = (await response.json()) as { text: string }
    return text
  },
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
  }
}
