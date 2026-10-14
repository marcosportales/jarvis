/**
 * The IPC channels between the Jarvis App and its pages. The preload script
 * (`preload.cts`) can't import this file, so it repeats them; its test keeps
 * the two the same.
 */

/** The Jarvis App to the Jarvis page: a `JarvisPageMessage`. */
export const PAGE_CHANNEL = "jarvis-app:page"

/** The Jarvis page to the Jarvis App: its Jarvis State, on every change. */
export const JARVIS_STATE_CHANNEL = "jarvis-app:jarvis-state"
