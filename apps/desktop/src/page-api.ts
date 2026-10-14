/**
 * What the Jarvis App and Jarvis's pages say to each other, defined once:
 * the Jarvis State, Push-to-talk, the Floating Orb's gestures, and
 * `window.jarvisApp`, the API the preload script gives the pages.
 *
 * It imports nothing, so the sandboxed preload script (`preload.cts`) can
 * import its types, which are erased, and the web app's App Bridge test can
 * check its own copy of the API against it.
 */

/** What Jarvis is doing, as the Jarvis page's Session says. */
export const JARVIS_STATES = [
  "idle",
  "listening",
  "thinking",
  "speaking",
] as const
export type JarvisState = (typeof JARVIS_STATES)[number]

/** Push-to-talk held from the Jarvis App: the key goes down, then up. */
export type PushToTalkAction = "press" | "release"

/**
 * What the Owner did with the mouse on the Floating Orb: a hold beyond a
 * short threshold is a Push-to-talk press then release; anything shorter is
 * a click.
 */
export const FLOATING_ORB_GESTURES = [
  "press",
  "release",
  "click",
] as const satisfies readonly (PushToTalkAction | "click")[]
export type FloatingOrbGesture = (typeof FLOATING_ORB_GESTURES)[number]

/**
 * `window.jarvisApp`, which the preload script exposes to Jarvis's pages.
 * Only the Jarvis App has it; a browser tab doesn't. The page side is the
 * App Bridge in `apps/web/lib/jarvis/app-bridge.ts`, which keeps its own
 * copy of this type; its test checks the two are the same.
 */
export type JarvisAppApi = {
  /**
   * Push-to-talk held from the Jarvis App: the key from any other app, or
   * the Floating Orb. A hold already going on is handed over at once as a
   * press. Returns a function that stops listening.
   */
  onPushToTalk(listener: (action: PushToTalkAction) => void): () => void
  /** Hands the Jarvis App the page's Jarvis State. */
  publishJarvisState(state: JarvisState): void
  /**
   * (Floating Orb) The Jarvis page's Jarvis State, as the Jarvis App relays
   * it: the latest one at once, if any, then every change. Returns a
   * function that stops listening.
   */
  onJarvisState(listener: (state: JarvisState) => void): () => void
  /** (Floating Orb) Hands the Jarvis App a hold, its release or a click. */
  sendFloatingOrbGesture(gesture: FloatingOrbGesture): void
}
