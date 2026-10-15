import type { JarvisSession } from "./session"

/**
 * What a press was made with: Space or the Orb on the Jarvis page, or the
 * Jarvis App (a key held in any other app, or the Floating Orb).
 */
export type OrbInputSource = "space" | "orb" | "jarvis-app"

/**
 * How long a press on the page must last to be Push-to-talk; released
 * sooner, it is a tap.
 */
export const HOLD_THRESHOLD_MS = 300

export type OrbInput = ReturnType<typeof createOrbInput>

/**
 * The Orb's input for one Session, from every source at once. A press on the
 * page released within `HOLD_THRESHOLD_MS` is a tap; still down by then, it
 * is a Push-to-talk hold. The Jarvis App tells a hold itself, so its press
 * holds at once. A press belongs to what started it: only that source's
 * release ends it, so letting go of one key can't end a hold made with
 * another.
 */
export function createOrbInput(
  session: Pick<
    JarvisSession,
    "getSnapshot" | "tap" | "pressPushToTalk" | "releasePushToTalk"
  >,
  { holdThresholdMs = HOLD_THRESHOLD_MS } = {}
) {
  // A page press not yet long enough to be a hold.
  let pending: {
    source: OrbInputSource
    timer: ReturnType<typeof setTimeout>
  } | null = null
  let holder: OrbInputSource | null = null

  function hold(source: OrbInputSource) {
    // Already held: the hold stays with whatever started it.
    if (session.getSnapshot().state === "listening") return
    session.pressPushToTalk()
    if (session.getSnapshot().state === "listening") holder = source
  }

  /** Forgets a press not yet a hold. */
  function dropPending() {
    if (!pending) return
    clearTimeout(pending.timer)
    pending = null
  }

  function release(source: OrbInputSource) {
    if (pending?.source === source) {
      dropPending()
      session.tap()
      return
    }
    if (holder !== source) return
    holder = null
    void session.releasePushToTalk()
  }

  return {
    press(source: OrbInputSource) {
      if (pending || holder) return
      if (source === "jarvis-app") return hold(source)
      pending = {
        source,
        timer: setTimeout(() => {
          pending = null
          hold(source)
        }, holdThresholdMs),
      }
    },
    release,
    /**
     * The page lost focus, so a keyup or pointerup may never arrive: a press
     * made on the page ends here, a hold sending its Utterance and a press
     * not yet a hold counting as nothing. A Jarvis App hold doesn't depend on
     * the page's focus and goes on.
     */
    windowBlurred() {
      dropPending()
      if (holder === "space" || holder === "orb") release(holder)
    },
  }
}
