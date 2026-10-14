/**
 * The Floating Orb's Electron window: small, transparent, frameless, never
 * focused, and told apart from the Jarvis window by a fixed title.
 *
 * Electron gives every window of an app the same Wayland `app_id` (and X11
 * `WM_CLASS`): `Jarvis`, from `desktopName` in package.json, which the
 * desktop portal also needs. It can't be set per window, so the Floating
 * Orb's window class is that `Jarvis` plus this fixed title, and Hyprland's
 * window rule matches both (see the README). The page can't change the
 * title.
 */

import { BrowserWindow, screen } from "electron"

export const FLOATING_ORB_TITLE = "Jarvis Floating Orb"

/** Its width and height, in pixels: room for the Orb and nothing else. */
const SIZE = 96

/** Its distance from the screen's edges where no window rule places it. */
const MARGIN = 24

export function createFloatingOrbWindow({
  preload,
  onClose,
}: {
  preload: string
  /** Whether to let it close: it stays while Jarvis runs. */
  onClose: () => "allow" | "deny"
}): BrowserWindow {
  // Bottom right of the main screen; Hyprland's window rule moves it anyway.
  const { workArea } = screen.getPrimaryDisplay()
  const window = new BrowserWindow({
    x: workArea.x + workArea.width - SIZE - MARGIN,
    y: workArea.y + workArea.height - SIZE - MARGIN,
    width: SIZE,
    height: SIZE,
    show: false,
    title: FLOATING_ORB_TITLE,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    // Clicking it must never take focus from the Owner's app.
    focusable: false,
    webPreferences: {
      // Its hold timer and the Orb's animation run while it's not focused.
      backgroundThrottling: false,
      contextIsolation: true,
      sandbox: true,
      preload,
    },
  })

  // Keeps the title the window rule matches, whatever the page's <title>.
  window.on("page-title-updated", (event) => event.preventDefault())
  window.on("close", (event) => {
    if (onClose() === "deny") event.preventDefault()
  })
  return window
}
