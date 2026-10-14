/**
 * The preload script of the Jarvis App's windows: exposes `window.jarvisApp`
 * (`JarvisAppApi` in `page-api.ts`) to Jarvis's pages. Only the Jarvis App
 * has it; a browser tab doesn't. The page side is the App Bridge in
 * `apps/web/lib/jarvis/app-bridge.ts` and the Floating Orb in
 * `apps/web/lib/jarvis/floating-orb.ts`.
 *
 * The windows are sandboxed, so this file may `require` nothing but
 * `electron`, and is CommonJS: it imports only types, which are erased, and
 * repeats the few values it needs, even the channel names in `channels.ts`.
 * Its test keeps those the same.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron"

import type {
  FloatingOrbGesture,
  JarvisAppApi,
  JarvisState,
  PushToTalkAction,
} from "./page-api.js"

const PAGE_CHANNEL = "jarvis-app:page"
const JARVIS_STATE_CHANNEL = "jarvis-app:jarvis-state"
const FLOATING_ORB_CHANNEL = "jarvis-app:floating-orb"

const JARVIS_STATES = new Set<unknown>([
  "idle",
  "listening",
  "thinking",
  "speaking",
] satisfies JarvisState[])

const PUSH_TO_TALK_ACTIONS = new Set<unknown>([
  "press",
  "release",
] satisfies PushToTalkAction[])

const FLOATING_ORB_GESTURES = new Set<unknown>([
  "press",
  "release",
  "click",
] satisfies FloatingOrbGesture[])

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
  if (typeof message !== "object" || message === null || !("type" in message))
    return
  if (
    message.type === "push-to-talk" &&
    "action" in message &&
    PUSH_TO_TALK_ACTIONS.has(message.action)
  ) {
    const action = message.action as PushToTalkAction
    pushToTalkHeld = action === "press"
    for (const listener of pushToTalkListeners) listener(action)
  }
  if (
    message.type === "jarvis-state" &&
    "state" in message &&
    JARVIS_STATES.has(message.state)
  ) {
    const state = message.state as JarvisState
    latestJarvisState = state
    for (const listener of jarvisStateListeners) listener(state)
  }
})

// The page is web content: whatever it passes is checked before it leaves.
const jarvisApp: JarvisAppApi = {
  onPushToTalk(listener) {
    pushToTalkListeners.add(listener)
    if (pushToTalkHeld) listener("press")
    return () => {
      pushToTalkListeners.delete(listener)
    }
  },

  publishJarvisState(state) {
    if (JARVIS_STATES.has(state)) ipcRenderer.send(JARVIS_STATE_CHANNEL, state)
  },

  onJarvisState(listener) {
    jarvisStateListeners.add(listener)
    if (latestJarvisState) listener(latestJarvisState)
    return () => {
      jarvisStateListeners.delete(listener)
    }
  },

  sendFloatingOrbGesture(gesture) {
    if (FLOATING_ORB_GESTURES.has(gesture)) {
      ipcRenderer.send(FLOATING_ORB_CHANNEL, gesture)
    }
  },
}

contextBridge.exposeInMainWorld("jarvisApp", jarvisApp)
