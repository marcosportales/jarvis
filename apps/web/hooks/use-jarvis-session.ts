"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

import { createBrowserAdapters } from "@/lib/jarvis/browser-adapters"
import { createJarvisSession, type SavedSession } from "@/lib/jarvis/session"

/** The live view of one Session: a saved one to resume, or a new one. */
export function useJarvisSession(saved?: SavedSession) {
  const [session] = useState(() =>
    createJarvisSession(createBrowserAdapters(), saved)
  )
  // Leaving the Session (opening another, or another page) silences it.
  useEffect(() => () => session.teardown(), [session])
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot
  )
  return { session, ...snapshot }
}
