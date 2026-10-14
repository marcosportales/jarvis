/**
 * The preload script of the Jarvis App's windows: exposes `window.jarvisApp`,
 * a small typed API, to Jarvis's pages. Only the Jarvis App has it; a
 * browser tab doesn't. The page side is the App Bridge in
 * `apps/web/lib/jarvis/app-bridge.ts`, which mirrors this API's type, and
 * the Floating Orb in `apps/web/lib/jarvis/floating-orb.ts`.
 *
 * The windows are sandboxed, so this file may `require` nothing but
 * `electron`, and is CommonJS: it can't share code, even the channel names in
 * `channels.ts`, with the rest of the Jarvis App.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron"

const PAGE_CHANNEL = "jarvis-app:page"
const JARVIS_STATE_CHANNEL = "jarvis-app:jarvis-state"
const FLOATING_ORB_CHANNEL = "jarvis-app:floating-orb"

type JarvisState = "idle" | "listening" | "thinking" | "speaking"
const JARVIS_STATES = new Set<unknown>([
  "idle",
  "listening",
  "thinking",
  "speaking",
])

type PushToTalkAction = "press" | "release"

type FloatingOrbGesture = "press" | "release" | "click"
const FLOATING_ORB_GESTURES = new Set<unknown>(["press", "release", "click"])

/**
 * The Floating Orb's Jarvis State, kept from the moment the page starts
 * loading: the Jarvis App sends it once the page has loaded, which may be
 * before the page listens.
 */
let latestJarvisState: JarvisState | undefined
const jarvisStateListeners = new Set<(state: JarvisState) => void>()

/**
 * Whether Push-to-talk is held from the Jarvis App right now. A page that
 * starts listening mid-hold, e.g. the Jarvis page the Marketplace went back
 * to on that press, gets the press at once.
 */
let pushToTalkHeld = false
const pushToTalkListeners = new Set<(action: PushToTalkAction) => void>()

ipcRenderer.on(PAGE_CHANNEL, (_event: IpcRendererEvent, message: unknown) => {
  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "push-to-talk" &&
    "action" in message &&
    (message.action === "press" || message.action === "release")
  ) {
    const action: PushToTalkAction = message.action
    pushToTalkHeld = action === "press"
    for (const listener of pushToTalkListeners) listener(action)
  }
  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "jarvis-state" &&
    "state" in message &&
    JARVIS_STATES.has(message.state)
  ) {
    latestJarvisState = message.state as JarvisState
    for (const listener of jarvisStateListeners) listener(latestJarvisState)
  }
})

const jarvisApp = {
  /**
   * Push-to-talk held from the Jarvis App: the key from any other app, or
   * the Floating Orb. A hold already going on is handed over at once as a
   * press. Returns a function that stops listening.
   */
  onPushToTalk(listener: (action: PushToTalkAction) => void): () => void {
    pushToTalkListeners.add(listener)
    if (pushToTalkHeld) listener("press")
    return () => {
      pushToTalkListeners.delete(listener)
    }
  },

  /** Hands the Jarvis App the page's Jarvis State. */
  publishJarvisState(state: string): void {
    if (JARVIS_STATES.has(state)) ipcRenderer.send(JARVIS_STATE_CHANNEL, state)
  },

  /**
   * (Floating Orb) The Jarvis page's Jarvis State, as the Jarvis App relays
   * it: the latest one at once, if any, then every change. Returns a
   * function that stops listening.
   */
  onJarvisState(listener: (state: JarvisState) => void): () => void {
    jarvisStateListeners.add(listener)
    if (latestJarvisState) listener(latestJarvisState)
    return () => {
      jarvisStateListeners.delete(listener)
    }
  },

  /** (Floating Orb) Hands the Jarvis App a hold, its release or a click. */
  sendFloatingOrbGesture(gesture: FloatingOrbGesture): void {
    if (FLOATING_ORB_GESTURES.has(gesture)) {
      ipcRenderer.send(FLOATING_ORB_CHANNEL, gesture)
    }
  },
}

export type JarvisAppApi = typeof jarvisApp

contextBridge.exposeInMainWorld("jarvisApp", jarvisApp)
