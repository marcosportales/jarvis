/**
 * The Electron adapter: wires Electron's real APIs to the App controller's
 * ports and feeds it Electron's events. Every decision is the controller's;
 * this file only keeps a single instance, grants Jarvis's pages the
 * microphone and the Owner's location, keeps the Jarvis window working (and
 * where it was) while hidden, and checks what the pages send over IPC.
 */

import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  screen,
  session,
  shell,
  Tray,
} from "electron"

import {
  FLOATING_ORB_CHANNEL,
  JARVIS_STATE_CHANNEL,
  PAGE_CHANNEL,
} from "./channels.js"
import { createAppController, type AppController } from "./controller.js"
import { connectSessionBus } from "./dbus.js"
import { jarvisServer, type JarvisServer } from "./electron-server.js"
import { createFloatingOrbWindow } from "./floating-orb-window.js"
import { parseFloatingOrbGesture, parseJarvisState } from "./page-messages.js"
import { grantsPermission } from "./permissions.js"
import { createPortalShortcuts } from "./portal-shortcuts.js"
import type {
  FloatingOrbPageMessage,
  JarvisPageMessage,
  Tray as TrayPort,
  Windows,
} from "./ports.js"
import { restoreBounds } from "./window-bounds.js"

const ICON = path.join(import.meta.dirname, "../assets/icon.png")

/** Gives Jarvis's pages `window.jarvisApp`; see `preload.cts`. */
const PRELOAD = path.join(import.meta.dirname, "preload.cjs")

/**
 * Jarvis's app id for the desktop portal, which accepts it only with a
 * `Jarvis.desktop` installed (see the README). Push-to-talk from any app is
 * bound in Hyprland to `Jarvis:push-to-talk`.
 */
const PORTAL_APP_ID = "Jarvis"

// Also names the config directory: ~/.config/Jarvis.
app.setName("Jarvis")

if (!app.requestSingleInstanceLock()) {
  // Another Jarvis App runs: it gets our arguments as a second launch.
  app.exit(0)
} else {
  start()
}

function start() {
  let jarvis: JarvisServer
  try {
    jarvis = jarvisServer()
  } catch (error) {
    dialog.showErrorBox(
      "Jarvis no ha podido arrancar",
      error instanceof Error ? error.message : String(error)
    )
    app.exit(1)
    return
  }
  const { origin } = jarvis

  const controller: AppController = createAppController({
    origin,
    logFile: jarvis.logFile,
    server: jarvis.server,
    windows: electronWindows(() => controller),
    tray: electronTray(),
    shortcuts: createPortalShortcuts({
      appId: PORTAL_APP_ID,
      connect: connectSessionBus,
      log: console,
    }),
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
    grantPermissionsToJarvis(origin)
    return controller.launch(process.argv)
  })
}

function grantPermissionsToJarvis(origin: string) {
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      callback(
        grantsPermission(origin, {
          permission,
          url: details.requestingUrl,
          mediaTypes: "mediaTypes" in details ? details.mediaTypes : undefined,
        })
      )
    }
  )
  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission, requestingOrigin, details) =>
      grantsPermission(origin, {
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
  let floatingOrb: BrowserWindow | undefined
  const boundsFile = path.join(app.getPath("userData"), "window-bounds.json")

  // Each page may send only its own messages: the Jarvis State from the
  // Jarvis page, holds and clicks from the Floating Orb.
  ipcMain.on(JARVIS_STATE_CHANNEL, (event, value: unknown) => {
    const state = parseJarvisState(value)
    if (state && event.sender === jarvis?.webContents) {
      controller().jarvisState(state)
    }
  })
  ipcMain.on(FLOATING_ORB_CHANNEL, (event, value: unknown) => {
    const gesture = parseFloatingOrbGesture(value)
    if (gesture && event.sender === floatingOrb?.webContents) {
      controller().floatingOrb(gesture)
    }
  })

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
          preload: PRELOAD,
        },
      })
      jarvis = window

      window.on("close", (event) => {
        saveBounds()
        if (controller().closeJarvisWindow() === "deny") event.preventDefault()
      })
      window.on("resized", saveBounds)
      window.on("moved", saveBounds)

      await loadJarvisPage(window, url, controller)
    },
    showJarvis: () => jarvis?.show(),
    hideJarvis: () => jarvis?.hide(),
    focusJarvis: () => jarvis?.focus(),
    isJarvisVisible: () => jarvis?.isVisible() ?? false,
    sendToJarvis: (message: JarvisPageMessage) =>
      jarvis?.webContents.send(PAGE_CHANNEL, message),

    async openFloatingOrb(url) {
      floatingOrb = createFloatingOrbWindow({
        preload: PRELOAD,
        onClose: () => controller().closeFloatingOrb(),
      })
      await loadJarvisPage(floatingOrb, url, controller)
    },
    showFloatingOrb: () => floatingOrb?.showInactive(),
    sendToFloatingOrb: (message: FloatingOrbPageMessage) =>
      floatingOrb?.webContents.send(PAGE_CHANNEL, message),
  }
}

/**
 * Loads one of Jarvis's pages in `window`, keeping it on Jarvis's own pages:
 * the controller sends any other URL to the Owner's browser.
 */
async function loadJarvisPage(
  window: BrowserWindow,
  url: string,
  controller: () => AppController
) {
  const { webContents } = window
  webContents.setWindowOpenHandler(({ url }) => ({
    action: controller().navigation(url),
  }))
  const leaveIfOutside = (event: Electron.Event, url: string) => {
    if (controller().navigation(url) === "deny") event.preventDefault()
  }
  webContents.on("will-navigate", (event) => leaveIfOutside(event, event.url))
  webContents.on("will-redirect", (event) => leaveIfOutside(event, event.url))

  try {
    await window.loadURL(url)
  } catch (error) {
    // The page shows its own error; the window can still be reloaded.
    console.error(`Couldn't load ${url}`, error)
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
