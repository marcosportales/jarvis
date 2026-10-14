const SESSIONS_CHANGED = "jarvis:sessions-changed"

/** Tells the "Sesiones" list a Session was created, resumed, titled or deleted. */
export function notifySessionsChanged() {
  window.dispatchEvent(new Event(SESSIONS_CHANGED))
}

export function onSessionsChanged(listener: () => void) {
  window.addEventListener(SESSIONS_CHANGED, listener)
  return () => window.removeEventListener(SESSIONS_CHANGED, listener)
}
