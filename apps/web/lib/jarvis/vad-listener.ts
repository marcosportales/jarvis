import type { MicVAD } from "@ricky0123/vad-web"

import {
  createPauses,
  DEFAULT_PAUSES,
  FRAME_MS,
  SAMPLE_RATE,
  type PauseOptions,
} from "./pauses"
import type { Listener, ListenerEvents } from "./session"

/**
 * Where vad-web's model and worklet, and ONNX Runtime's wasm, are served
 * from: the web app's public folder, copied there by `copy-vad-assets`.
 */
const ASSET_PATH = "/vad/"

const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    channelCount: 1,
    // The page plays the Reply too, so the browser can take it out.
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
}

const getMic = () => navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS)

/** 16-bit mono WAV, which Whisper takes as it is. */
async function toWav(frames: Float32Array[]): Promise<Blob> {
  const { utils } = await import("@ricky0123/vad-web")
  const samples = new Float32Array(frames.length * (frames[0]?.length ?? 0))
  frames.forEach((frame, index) => samples.set(frame, index * frame.length))
  return new Blob([utils.encodeWAV(samples, 1, SAMPLE_RATE, 1, 16)], {
    type: "audio/wav",
  })
}

/**
 * The Listener on Silero VAD v6 through vad-web, running in the page. One
 * mic stream feeds voice detection; its speech probabilities alone decide
 * when the Owner starts and stops speaking (see `createPauses`), never the
 * loudness. A hold ignores them and captures until its release. Audio is
 * only ever held in memory, until its piece is handed over.
 */
export function createVadListener(
  pauseOptions: PauseOptions = DEFAULT_PAUSES
): Listener {
  const subscribers = new Set<ListenerEvents>()
  const pauses = createPauses(pauseOptions)
  // Loaded once and kept, so reopening the mic is quick.
  let loaded: Promise<MicVAD> | null = null
  // Whether the mic should be open, so a close during `open` wins.
  let wanted = false
  // The latest start or pause of voice detection, in order.
  let mic = Promise.resolve()
  // Timed from its start, so waiting on the mic still counts.
  let hold: { startedAt: number; frames: Float32Array[] } | null = null
  // Pieces are encoded in order, so they're handed over in order.
  let handOver = Promise.resolve()

  function emit(report: (events: ListenerEvents) => void) {
    subscribers.forEach(report)
  }

  function handOverPiece(frames: Float32Array[], durationMs: number) {
    handOver = handOver
      .then(async () => {
        const audio = await toWav(frames)
        emit((events) => events.pieceReady(audio, durationMs))
      })
      .catch((error: unknown) => emit((events) => events.failed(error)))
  }

  function handOverEnd() {
    handOver = handOver.then(() => emit((events) => events.endOfTurn()))
  }

  function onFrame(probability: number, frame: Float32Array) {
    if (!wanted) return
    // vad-web may reuse the frame's buffer.
    const copy = new Float32Array(frame)
    if (hold) return void hold.frames.push(copy)
    for (const event of pauses.push(probability, copy)) {
      if (event.type === "speechStarted") {
        emit((events) => events.speechStarted())
      } else if (event.type === "piece") {
        handOverPiece(event.frames, event.frames.length * FRAME_MS)
      } else {
        handOverEnd()
      }
    }
  }

  async function load(): Promise<MicVAD> {
    const { MicVAD } = await import("@ricky0123/vad-web")
    return MicVAD.new({
      // vad-web's default is still "legacy".
      model: "v6",
      baseAssetPath: ASSET_PATH,
      onnxWASMBasePath: ASSET_PATH,
      ortConfig: (ort) => {
        ort.env.wasm.numThreads = 1
        ort.env.logLevel = "error"
      },
      startOnLoad: false,
      getStream: getMic,
      resumeStream: getMic,
      // Only its probabilities are used. Its own segments end on the same
      // pause as an Utterance, so it never holds more audio than one.
      positiveSpeechThreshold: pauseOptions.startThreshold,
      negativeSpeechThreshold: pauseOptions.endThreshold,
      redemptionMs: pauseOptions.endOfTurnPauseMs,
      preSpeechPadMs: 0,
      minSpeechMs: 0,
      onFrameProcessed: (probabilities, frame) =>
        onFrame(probabilities.isSpeech, frame),
    })
  }

  /**
   * Starts or pauses voice detection to match `wanted`, one change at a
   * time, so quick taps never start it twice. Pausing releases the mic.
   */
  function syncMic(): Promise<void> {
    const change = mic.then(async () => {
      if (!wanted && !loaded) return
      const vad = await (loaded ??= load())
      if (!wanted) return vad.pause()
      await vad.start()
      if (vad.errored) throw new Error(vad.errored)
    })
    mic = change.catch(() => {})
    return change
  }

  function forget() {
    hold = null
    pauses.reset()
  }

  return {
    async open() {
      wanted = true
      try {
        await syncMic()
      } catch (error) {
        // Loaded again next time: a failed start leaves vad-web stuck.
        const failed = loaded
        loaded = null
        void failed?.then((vad) => vad.destroy()).catch(() => {})
        throw error
      }
    },
    close() {
      wanted = false
      forget()
      void syncMic().catch(() => {})
    },
    holdStart() {
      // The pre-roll keeps a word begun before the press became a hold.
      hold = { startedAt: performance.now(), frames: pauses.preRoll() }
      pauses.reset()
    },
    holdEnd() {
      const current = hold
      hold = null
      if (!current || !wanted) {
        const error = new Error("No hold in progress")
        return emit((events) => events.failed(error))
      }
      handOverPiece(current.frames, performance.now() - current.startedAt)
      handOverEnd()
    },
    listen(events) {
      subscribers.add(events)
      return () => {
        subscribers.delete(events)
      }
    },
  }
}
