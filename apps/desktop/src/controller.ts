/**
 * The App controller holds the Jarvis App's decisions: when the Jarvis window
 * shows, what closing it means, how Jarvis quits, what the Floating Orb
 * relays, and which URLs leave for the Owner's browser. It works only
 * through its ports, so it never touches Electron; the Electron adapter in
 * `main.ts` feeds it events and obeys it.
 */

import type {
  Dialogs,
  FloatingOrbGesture,
  JarvisState,
  Server,
  Shell,
  Shortcuts,
  Tray,
  Windows,
} from "./ports.js"

export type AppControllerPorts = {
  /** Jarvis's own origin, e.g. `http://localhost:3000` in dev mode. */
  origin: string
  /** Where the server's output goes, told to the Owner when it fails. */
  logFile?: string
  server: Server
  windows: Windows
  shell: Shell
  dialogs: Dialogs
  /** Missing on desktops without a tray; the Jarvis App works the same. */
  tray?: Tray
  /** Missing where Push-to-talk from any app isn't available. */
  shortcuts?: Shortcuts
  /** Ends the Jarvis App's process. */
  exit: () => void
}

/** Whether Electron may go ahead with a close, navigation or new window. */
export type Verdict = "allow" | "deny"

export type AppController = ReturnType<typeof createAppController>

/** Schemes worth handing to the Owner's browser; anything else is dropped. */
const BROWSER_SCHEMES = new Set(["http:", "https:", "mailto:"])

export function createAppController({
  origin,
  logFile,
  server,
  windows,
  shell,
  dialogs,
  tray,
  shortcuts,
  exit,
}: AppControllerPorts) {
  /** Whether the Jarvis window is open on the page (shown or hidden). */
  let jarvisOpen = false
  /** A request to show the window that came before it was open. */
  let showWhenOpen = false
  let floatingOrbOpen = false
  /** The Jarvis page's latest Jarvis State, for a Floating Orb opened later. */
  let jarvisState: JarvisState | undefined
  let quitting: Promise<void> | undefined

  function showJarvis() {
    if (!jarvisOpen) {
      showWhenOpen = true
      return
    }
    windows.showJarvis()
    windows.focusJarvis()
  }

  function quit() {
    quitting ??= (async () => {
      try {
        await server.stop()
      } finally {
        exit()
      }
    })()
    return quitting
  }

  /** Push-to-talk reaches the page without showing or focusing the window. */
  function sendPushToTalk(action: "press" | "release") {
    if (jarvisOpen) windows.sendToJarvis({ type: "push-to-talk", action })
  }

  function sendJarvisState(state: JarvisState) {
    windows.sendToFloatingOrb({ type: "jarvis-state", state })
  }

  /** Tells the Owner why Jarvis can't go on, then quits. */
  function failed(title: string, detail: string) {
    if (quitting) return quitting
    dialogs.showError(
      title,
      logFile ? `${detail}\n\nMás detalles en el registro: ${logFile}` : detail
    )
    return quit()
  }

  return {
    /** The Jarvis App starts, with its command-line arguments. */
    async launch(argv: readonly string[]) {
      if (argv.includes("--quit")) return exit()

      showWhenOpen = !argv.includes("--hidden")
      server.onExit((reason) => {
        void failed(
          "Jarvis se ha detenido",
          `El servidor de Jarvis se ha detenido: ${reason}`
        )
      })
      tray?.show({ showJarvis, quit })
      shortcuts?.onPushToTalk({
        pressed: () => sendPushToTalk("press"),
        released: () => sendPushToTalk("release"),
      })

      try {
        await server.start()
        await server.waitUntilReady()
      } catch (error) {
        return failed(
          "Jarvis no ha podido arrancar",
          `El servidor de Jarvis no responde: ${error instanceof Error ? error.message : String(error)}`
        )
      }
      if (quitting) return

      await Promise.all([
        (async () => {
          await windows.openJarvis(`${origin}/`)
          jarvisOpen = true
          if (showWhenOpen) showJarvis()
        })(),
        (async () => {
          // The Floating Orb is always shown, even when launched --hidden.
          await windows.openFloatingOrb(`${origin}/floating-orb`)
          floatingOrbOpen = true
          windows.showFloatingOrb()
          if (jarvisState) sendJarvisState(jarvisState)
        })(),
      ])
    },

    /** The Jarvis App was launched again while this one runs. */
    secondLaunch(argv: readonly string[]) {
      if (argv.includes("--quit")) return void quit()
      showJarvis()
    },

    /**
     * The Jarvis page's Jarvis State changed. The Floating Orb shows it too,
     * so both always agree.
     */
    jarvisState(state: JarvisState) {
      jarvisState = state
      if (floatingOrbOpen) sendJarvisState(state)
    },

    /**
     * The Owner held or clicked the Floating Orb. A hold is Push-to-talk on
     * the Jarvis page, which stays hidden or behind; a click brings it up.
     */
    floatingOrb(gesture: FloatingOrbGesture) {
      if (gesture === "click") showJarvis()
      else sendPushToTalk(gesture)
    },

    /** Something tries to close the Floating Orb: it stays while Jarvis runs. */
    closeFloatingOrb(): Verdict {
      return quitting ? "allow" : "deny"
    },

    /** The Owner closes the Jarvis window: hide it, unless Jarvis is quitting. */
    closeJarvisWindow(): Verdict {
      if (quitting) return "allow"
      windows.hideJarvis()
      return "deny"
    },

    /**
     * A page wants to go to `url`, in place or in a new window. Jarvis's own
     * pages stay in the app; anything else opens in the Owner's browser.
     */
    navigation(url: string): Verdict {
      let target: URL
      try {
        target = new URL(url)
      } catch {
        return "deny"
      }
      if (target.origin === new URL(origin).origin) return "allow"
      if (BROWSER_SCHEMES.has(target.protocol)) shell.openInBrowser(url)
      return "deny"
    },

    /** "Salir de Jarvis": stops the server, then exits. */
    quit,
  }
}
