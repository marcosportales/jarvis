"use client"

import { useState, useSyncExternalStore } from "react"

import { createBrowserAdapters } from "@/lib/jarvis/browser-adapters"
import { createJarvisSession, type SavedSession } from "@/lib/jarvis/session"

/** The live view of one Session: a saved one to resume, or a new one. */
export function useJarvisSession(saved?: SavedSession) {
  const [session] = useState(() =>
    createJarvisSession(createBrowserAdapters(), saved)
  )
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot
  )
  return { session, ...snapshot }
}
