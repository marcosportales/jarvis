/**
 * When the Owner has started speaking, finished a piece, and finished the
 * Utterance, judged frame by frame from voice detection's speech
 * probabilities. Pure: no audio APIs. Lifted from lane E of the end-of-turn
 * prototype (branch `prototype/hands-free-end-of-turn-pause`), made to run
 * as the frames come.
 */

/** Silero v5/v6: 512 samples at 16 kHz. */
export const FRAME_MS = 32
export const SAMPLE_RATE = 16_000

export type PauseOptions = {
  /** A frame at or above it is speech. */
  startThreshold: number
  /**
   * A frame below it counts toward a pause. One in between neither counts
   * nor breaks the pause, as in lane E: a pause is that many quiet frames,
   * not necessarily in a row.
   */
  endThreshold: number
  /** Less speech than this in an Utterance is a noise, never an Utterance. */
  minSpeechMs: number
  /** Audio kept from before speech starts, so the first word isn't cut. */
  preRollMs: number
  /** A pause this long ends a piece, which is Transcribed at once. */
  piecePauseMs: number
  /** A pause this long ends the Utterance. */
  endOfTurnPauseMs: number
}

export const DEFAULT_PAUSES: PauseOptions = {
  startThreshold: 0.3,
  endThreshold: 0.25,
  minSpeechMs: 250,
  preRollMs: 400,
  piecePauseMs: 500,
  endOfTurnPauseMs: 1200,
}

export type PauseEvent =
  | { type: "speechStarted" }
  | { type: "piece"; frames: Float32Array[] }
  | { type: "endOfTurn" }

const toFrames = (ms: number) => Math.floor(ms / FRAME_MS)

/**
 * Feeds frames one at a time; each returns what it ended or started. Speech
 * counts as started only once it has lasted `minSpeechMs`, so a noise never
 * starts an Utterance. Pieces finished before then are held and come right
 * after `speechStarted`. Every frame belongs to at most one piece.
 */
export function createPauses(options: PauseOptions = DEFAULT_PAUSES) {
  const preRollFrames = toFrames(options.preRollMs)
  const minSpeechFrames = toFrames(options.minSpeechMs)
  const pieceFrames = toFrames(options.piecePauseMs)
  const endOfTurnFrames = toFrames(options.endOfTurnPauseMs)

  // Frames since the last piece ended, at most the pre-roll while no piece.
  let recent: Float32Array[] = []
  let piece: { frames: Float32Array[]; quiet: number } | null = null
  let utterance: {
    speechFrames: number
    quiet: number
    started: boolean
    /** Pieces finished before speech counted as started. */
    held: Float32Array[][]
  } | null = null

  function endPiece(events: PauseEvent[]) {
    if (!piece) return
    const { frames } = piece
    piece = null
    recent = []
    if (utterance?.started) events.push({ type: "piece", frames })
    else utterance?.held.push(frames)
  }

  return {
    push(probability: number, frame: Float32Array): PauseEvent[] {
      const events: PauseEvent[] = []
      const isSpeech = probability >= options.startThreshold
      if (isSpeech) {
        utterance ??= { speechFrames: 0, quiet: 0, started: false, held: [] }
        utterance.speechFrames++
        utterance.quiet = 0
        if (piece) piece.quiet = 0
        else {
          piece = { frames: recent, quiet: 0 }
          recent = []
        }
      }
      if (piece) piece.frames.push(frame)
      else {
        recent.push(frame)
        if (recent.length > preRollFrames) recent.shift()
      }

      if (
        utterance &&
        !utterance.started &&
        utterance.speechFrames >= minSpeechFrames
      ) {
        utterance.started = true
        events.push({ type: "speechStarted" })
        for (const frames of utterance.held)
          events.push({ type: "piece", frames })
        utterance.held = []
      }

      if (probability < options.endThreshold) {
        if (piece && ++piece.quiet >= pieceFrames) endPiece(events)
        if (utterance && ++utterance.quiet >= endOfTurnFrames) {
          endPiece(events)
          if (utterance.started) events.push({ type: "endOfTurn" })
          utterance = null
        }
      }
      return events
    },
    /** Forgets everything heard so far, e.g. when a hold takes over. */
    reset() {
      recent = []
      piece = null
      utterance = null
    },
    /** The latest frames, at most the pre-roll, e.g. to start a hold with. */
    preRoll(): Float32Array[] {
      return (piece?.frames ?? recent).slice(-preRollFrames)
    },
  }
}
