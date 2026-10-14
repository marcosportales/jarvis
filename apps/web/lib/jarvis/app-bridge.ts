import type { PushToTalk } from "./push-to-talk"
import type { JarvisSession, JarvisState } from "./session"

/**
 * What the Owner did with the mouse on the Floating Orb: a hold (a press,
 * then its release) or a click.
 */
export type FloatingOrbGesture = "press" | "release" | "click"

/**
 * What the Jarvis App's preload script exposes to Jarvis's pages as
 * `window.jarvisApp`. A browser tab has none. Mirrors
 * `apps/desktop/src/preload.cts`, which can't share this file.
 */
export type JarvisAppApi = {
  /**
   * Push-to-talk held from the Jarvis App: the key from any other app, or
   * the Floating Orb. A hold already going on is handed over at once as a
   * press. Returns a function that stops listening.
   */
  onPushToTalk(listener: (action: "press" | "release") => void): () => void
  /** Hands the Jarvis App the Jarvis State, e.g. for the Floating Orb. */
  publishJarvisState(state: JarvisState): void
  /**
   * (Floating Orb page) The Jarvis page's Jarvis State, as the Jarvis App
   * relays it: the latest one at once, if any, then every change. Returns a
   * function that stops listening.
   */
  onJarvisState(listener: (state: JarvisState) => void): () => void
  /** (Floating Orb page) Hands the Jarvis App a hold, its release or a click. */
  sendFloatingOrbGesture(gesture: FloatingOrbGesture): void
}

declare global {
  interface Window {
    jarvisApp?: JarvisAppApi
  }
}

/**
 * The App Bridge: connects a Session on the Jarvis page to the Jarvis App,
 * when the page runs inside it. Push-to-talk from the Jarvis App holds the
 * Session's Push-to-talk, and every change of its Jarvis State is published.
 * Without the Jarvis App nothing is wired. Returns a function that
 * disconnects, publishing Idle.
 */
export function connectAppBridge({
  session,
  pushToTalk,
  app,
}: {
  session: Pick<JarvisSession, "getSnapshot" | "subscribe">
  pushToTalk: PushToTalk
  app: Pick<JarvisAppApi, "onPushToTalk" | "publishJarvisState"> | undefined
}): () => void {
  if (!app) return () => {}

  let published = session.getSnapshot().state
  app.publishJarvisState(published)
  const unsubscribe = session.subscribe(() => {
    const { state } = session.getSnapshot()
    if (state === published) return
    published = state
    app.publishJarvisState(state)
  })

  const stopListening = app.onPushToTalk((action) => {
    if (action === "press") pushToTalk.press("jarvis-app")
    else pushToTalk.release("jarvis-app")
  })

  return () => {
    unsubscribe()
    stopListening()
    // The page is leaving its Session, which is silenced with it: until
    // another one connects, Jarvis is doing nothing.
    app.publishJarvisState("idle")
  }
}

/**
 * For a page of Jarvis without a Session, e.g. the Marketplace: a
 * Push-to-talk press from the Jarvis App goes back to the Jarvis page, whose
 * new Session is handed the hold still going on (see `onPushToTalk`). The
 * window stays hidden or behind, as for any Push-to-talk from the Jarvis
 * App. Returns a function that stops listening.
 */
export function returnToJarvisOnPushToTalk({
  app,
  goToJarvisPage,
}: {
  app: Pick<JarvisAppApi, "onPushToTalk"> | undefined
  goToJarvisPage: () => void
}): () => void {
  if (!app) return () => {}
  return app.onPushToTalk((action) => {
    if (action === "press") goToJarvisPage()
  })
}
