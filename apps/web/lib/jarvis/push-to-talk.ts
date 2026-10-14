import type { JarvisSession } from "./session"

/**
 * What a Push-to-talk hold was started with: Space or the Orb on the Jarvis
 * page, or the Jarvis App (a key held in any other app, or the Floating Orb).
 */
export type HoldSource = "space" | "orb" | "jarvis-app"

export type PushToTalk = ReturnType<typeof createPushToTalk>

/**
 * Push-to-talk for one Session, from every source at once. A hold belongs to
 * what started it: only that source's release sends the Utterance, so letting
 * go of one key can't end a hold made with another.
 */
export function createPushToTalk(
  session: Pick<
    JarvisSession,
    "getSnapshot" | "pressPushToTalk" | "releasePushToTalk"
  >
) {
  let holder: HoldSource | null = null

  function release(source: HoldSource) {
    if (holder !== source) return
    holder = null
    void session.releasePushToTalk()
  }

  return {
    press(source: HoldSource) {
      // Already held: the hold stays with whatever started it.
      if (session.getSnapshot().state === "listening") return
      session.pressPushToTalk()
      if (session.getSnapshot().state === "listening") holder = source
    },
    release,
    /**
     * The page lost focus, so a keyup or pointerup may never arrive: a hold
     * made on the page ends here. A Jarvis App hold doesn't depend on the
     * page's focus and goes on.
     */
    windowBlurred() {
      if (holder === "space" || holder === "orb") release(holder)
    },
  }
}
