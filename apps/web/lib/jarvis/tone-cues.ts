import type { Cue, Cues } from "./session"

type Tone = {
  wave: OscillatorType
  /** Peak loudness, 0–1. */
  gain: number
  /** Pitches in Hz, played one after another. */
  notes: number[]
  noteMs: number
}

/**
 * Placeholders, told apart by shape: on rises, off falls, a sent Turn is one
 * soft low note, queued speech is a quick high double. Ticket 14 on the map,
 * How the Orb, Floating Orb and Caption show Hands-free and the cues, picks
 * the real sounds.
 */
const TONES: Record<Cue, Tone> = {
  handsFreeOn: { wave: "sine", gain: 0.2, notes: [660, 990], noteMs: 90 },
  handsFreeOff: { wave: "sine", gain: 0.2, notes: [990, 660], noteMs: 90 },
  turnSent: { wave: "triangle", gain: 0.12, notes: [440], noteMs: 110 },
  speechQueued: { wave: "sine", gain: 0.15, notes: [1320, 1320], noteMs: 50 },
}

const GAP_MS = 25
const ATTACK_S = 0.005

/** Plays the cues as short tones made on the spot: nothing is downloaded. */
export function createToneCues(): Cues {
  // Made on first use, which is usually the Owner's tap or keypress.
  let context: AudioContext | null = null

  return {
    play(cue) {
      try {
        const audio = (context ??= new AudioContext())
        // A context made outside a gesture starts suspended.
        if (audio.state === "suspended") void audio.resume()
        const { wave, gain, notes, noteMs } = TONES[cue]
        const start = audio.currentTime
        notes.forEach((hz, index) => {
          const at = start + (index * (noteMs + GAP_MS)) / 1000
          const end = at + noteMs / 1000
          const oscillator = new OscillatorNode(audio, {
            type: wave,
            frequency: hz,
          })
          const envelope = new GainNode(audio, { gain: 0 })
          envelope.gain.setValueAtTime(0, at)
          envelope.gain.linearRampToValueAtTime(gain, at + ATTACK_S)
          envelope.gain.exponentialRampToValueAtTime(0.0001, end)
          oscillator.connect(envelope).connect(audio.destination)
          oscillator.start(at)
          oscillator.stop(end)
        })
      } catch (error) {
        // A missing cue never gets in the way of the Turn.
        console.error("Playing a cue failed", error)
      }
    },
  }
}
