/**
 * The ports the App controller decides through. Each is a narrow view of one
 * thing the Jarvis App needs from Electron or the computer, so the controller
 * is tested with fakes and never touches Electron itself.
 */

import type { JarvisState, PushToTalkAction } from "./page-api.js"

/** Jarvis's server: in dev mode the `next dev` one, otherwise its own. */
export type Server = {
  /** Starts it; a server that is already running elsewhere does nothing. */
  start(): Promise<void>
  /** Resolves once it answers over HTTP; rejects if it never does. */
  waitUntilReady(): Promise<void>
  stop(): Promise<void>
  /** Called when the server exits without having been stopped. */
  onExit(listener: (reason: string) => void): void
}

/** A message from the Jarvis App to the Jarvis page. */
export type JarvisPageMessage = {
  type: "push-to-talk"
  action: PushToTalkAction
}

/** A message from the Jarvis App to the Floating Orb page. */
export type FloatingOrbPageMessage = {
  type: "jarvis-state"
  state: JarvisState
}

/** The Jarvis App's windows: the Jarvis window and the Floating Orb. */
export type Windows = {
  /** Opens the Jarvis window on `url`, hidden; resolves once it's loaded. */
  openJarvis(url: string): Promise<void>
  showJarvis(): void
  hideJarvis(): void
  focusJarvis(): void
  sendToJarvis(message: JarvisPageMessage): void
  /** Opens the Floating Orb on `url`, hidden; resolves once it's loaded. */
  openFloatingOrb(url: string): Promise<void>
  /** Shows the Floating Orb without giving it focus. */
  showFloatingOrb(): void
  sendToFloatingOrb(message: FloatingOrbPageMessage): void
}

/** Push-to-talk held from any app. */
export type Shortcuts = {
  onPushToTalk(listeners: { pressed(): void; released(): void }): void
}

/** The tray icon, on desktops that have a tray. */
export type Tray = {
  /** Shows "Mostrar Jarvis" and "Salir". */
  show(actions: { showJarvis(): void; quit(): void }): void
}

export type Shell = {
  /** Opens `url` in the Owner's own browser. */
  openInBrowser(url: string): void
}

export type Dialogs = {
  showError(title: string, detail: string): void
}
