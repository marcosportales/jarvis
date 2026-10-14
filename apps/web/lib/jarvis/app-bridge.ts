import type { PushToTalk } from "./push-to-talk"
import type { JarvisSession, JarvisState } from "./session"

/**
 * What the Jarvis App's preload script exposes to Jarvis's pages as
 * `window.jarvisApp`. A browser tab has none. Mirrors
 * `apps/desktop/src/preload.cts`, which can't share this file.
 */
export type JarvisAppApi = {
  /**
   * Push-to-talk held from the Jarvis App: the key from any other app, or
   * the Floating Orb. Returns a function that stops listening.
   */
  onPushToTalk(listener: (action: "press" | "release") => void): () => void
  /** Hands the Jarvis App the Jarvis State, e.g. for the Floating Orb. */
  publishJarvisState(state: JarvisState): void
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
 * disconnects.
 */
export function connectAppBridge({
  session,
  pushToTalk,
  app,
}: {
  session: Pick<JarvisSession, "getSnapshot" | "subscribe">
  pushToTalk: PushToTalk
  app: JarvisAppApi | undefined
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
  }
}
