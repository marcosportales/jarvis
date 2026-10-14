/** A page asking for a permission, as Electron describes it. */
export type PermissionAsk = {
  permission: string
  /** The asking page's URL or origin. */
  url: string
  /** For `media`: what it wants to capture, when Electron says. */
  mediaTypes?: readonly ("audio" | "video")[]
}

/**
 * Whether the Jarvis App grants a permission without asking the Owner. Only
 * Jarvis's own pages get any, and only what the web app uses: the
 * microphone, so Push-to-talk works from the first hold, and the Owner's
 * location, for the Weather Widget. Everything else is refused, as an
 * unanswered browser prompt would be.
 */
export function grantsPermission(jarvisOrigin: string, ask: PermissionAsk) {
  if (!isJarvisPage(jarvisOrigin, ask.url)) return false
  switch (ask.permission) {
    case "media":
      // The microphone, never the camera.
      return !ask.mediaTypes?.some((type) => type !== "audio")
    case "geolocation":
      return true
    default:
      return false
  }
}

function isJarvisPage(jarvisOrigin: string, url: string) {
  try {
    return new URL(url).origin === new URL(jarvisOrigin).origin
  } catch {
    return false
  }
}
