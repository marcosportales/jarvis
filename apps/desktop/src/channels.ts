/**
 * The IPC channels between the Jarvis App and its pages. The preload script
 * (`preload.cts`) can't import this file, so it repeats them; its test keeps
 * the two the same.
 */

/**
 * The Jarvis App to its pages: a `JarvisPageMessage` to the Jarvis page, a
 * `FloatingOrbPageMessage` to the Floating Orb.
 */
export const PAGE_CHANNEL = "jarvis-app:page"

/** The Jarvis page to the Jarvis App: its Jarvis State, on every change. */
export const JARVIS_STATE_CHANNEL = "jarvis-app:jarvis-state"

/** The Floating Orb page to the Jarvis App: a `FloatingOrbGesture`. */
export const FLOATING_ORB_CHANNEL = "jarvis-app:floating-orb"
