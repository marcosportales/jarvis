/**
 * The Electron adapter: wires Electron's real APIs to the App controller's
 * ports and feeds it Electron's events. Every decision is the controller's;
 * this file only keeps a single instance, grants the microphone, and keeps
 * the Jarvis window working (and where it was) while hidden.
 */

import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  screen,
  session,
  shell,
  Tray,
} from "electron"

import { createAppController, type AppController } from "./controller.js"
import { createDevServer } from "./dev-server.js"
import { grantsPermission } from "./permissions.js"
import type { JarvisPageMessage, Tray as TrayPort, Windows } from "./ports.js"
import { restoreBounds } from "./window-bounds.js"

/** Dev mode: Jarvis is the `next dev` server beside the Jarvis App. */
const JARVIS_ORIGIN = "http://localhost:3000"

/** `next dev` builds the page on its first request, which can be slow. */
const READY_TIMEOUT_MS = 120_000

/** The IPC channel the Jarvis page hears the Jarvis App on. */
const PAGE_CHANNEL = "jarvis-app:page"

const ICON = path.join(import.meta.dirname, "../assets/icon.png")

// Also names the config directory: ~/.config/Jarvis.
app.setName("Jarvis")

if (!app.requestSingleInstanceLock()) {
  // Another Jarvis App runs: it gets our arguments as a second launch.
  app.exit(0)
} else {
  start()
}

function start() {
  const controller: AppController = createAppController({
    origin: JARVIS_ORIGIN,
    server: createDevServer({
      origin: JARVIS_ORIGIN,
      timeoutMs: READY_TIMEOUT_MS,
    }),
    windows: electronWindows(() => controller),
    tray: electronTray(),
    shell: { openInBrowser: (url) => void shell.openExternal(url) },
    dialogs: {
      showError: (title, detail) => dialog.showErrorBox(title, detail),
    },
    exit: () => app.exit(0),
  })

  app.on("second-instance", (_event, argv) => controller.secondLaunch(argv))

  // Any other way of quitting (logout, a signal) goes through the controller.
  app.on("before-quit", (event) => {
    event.preventDefault()
    void controller.quit()
  })
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => void controller.quit())
  }
  // The Jarvis window is hidden, never closed, so this is only reached while
  // quitting; without a listener Electron would quit on its own.
  app.on("window-all-closed", () => {})

  void app.whenReady().then(() => {
    grantMicrophoneToJarvis()
    return controller.launch(process.argv)
  })
}

function grantMicrophoneToJarvis() {
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      callback(
        grantsPermission(JARVIS_ORIGIN, {
          permission,
          url: details.requestingUrl,
          mediaTypes: "mediaTypes" in details ? details.mediaTypes : undefined,
        })
      )
    }
  )
  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission, requestingOrigin, details) =>
      grantsPermission(JARVIS_ORIGIN, {
        permission,
        url: requestingOrigin,
        mediaTypes:
          details.mediaType && details.mediaType !== "unknown"
            ? [details.mediaType]
            : undefined,
      })
  )
}

function electronWindows(controller: () => AppController): Windows {
  let jarvis: BrowserWindow | undefined
  const boundsFile = path.join(app.getPath("userData"), "window-bounds.json")

  function saveBounds() {
    if (!jarvis || jarvis.isDestroyed()) return
    try {
      writeFileSync(boundsFile, JSON.stringify(jarvis.getNormalBounds()))
    } catch (error) {
      console.error("Couldn't save the Jarvis window's bounds", error)
    }
  }

  return {
    async openJarvis(url) {
      const window = new BrowserWindow({
        ...restoreBounds(readSaved(boundsFile), screenWorkAreas()),
        show: false,
        title: "Jarvis",
        icon: ICON,
        autoHideMenuBar: true,
        backgroundColor: "#000000",
        webPreferences: {
          // Recording and Speaking go on while the window is hidden.
          backgroundThrottling: false,
          contextIsolation: true,
          sandbox: true,
        },
      })
      jarvis = window

      window.on("close", (event) => {
        saveBounds()
        if (controller().closeJarvisWindow() === "deny") event.preventDefault()
      })
      window.on("resized", saveBounds)
      window.on("moved", saveBounds)

      const { webContents } = window
      webContents.setWindowOpenHandler(({ url }) => ({
        action: controller().navigation(url),
      }))
      const leaveIfOutside = (event: Electron.Event, url: string) => {
        if (controller().navigation(url) === "deny") event.preventDefault()
      }
      webContents.on("will-navigate", (event) =>
        leaveIfOutside(event, event.url)
      )
      webContents.on("will-redirect", (event) =>
        leaveIfOutside(event, event.url)
      )

      try {
        await window.loadURL(url)
      } catch (error) {
        // The page shows its own error; the window can still be reloaded.
        console.error(`Couldn't load ${url}`, error)
      }
    },
    showJarvis: () => jarvis?.show(),
    hideJarvis: () => jarvis?.hide(),
    focusJarvis: () => jarvis?.focus(),
    isJarvisVisible: () => jarvis?.isVisible() ?? false,
    sendToJarvis: (message: JarvisPageMessage) =>
      jarvis?.webContents.send(PAGE_CHANNEL, message),
  }
}

/** The tray icon; on a desktop without a tray it just never appears. */
function electronTray(): TrayPort {
  // Kept here so the icon isn't garbage-collected away.
  let tray: Tray | undefined
  return {
    show({ showJarvis, quit }) {
      tray = new Tray(ICON)
      tray.setToolTip("Jarvis")
      tray.setContextMenu(
        Menu.buildFromTemplate([
          { label: "Mostrar Jarvis", click: showJarvis },
          { type: "separator" },
          { label: "Salir", click: quit },
        ])
      )
      tray.on("click", showJarvis)
    },
  }
}

function readSaved(file: string) {
  try {
    return readFileSync(file, "utf8")
  } catch {
    return undefined
  }
}

function screenWorkAreas() {
  return screen.getAllDisplays().map((display) => display.workArea)
}
