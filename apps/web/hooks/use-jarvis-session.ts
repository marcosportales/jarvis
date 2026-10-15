"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

import { connectAppBridge } from "@/lib/jarvis/app-bridge"
import { createBrowserAdapters } from "@/lib/jarvis/browser-adapters"
import { createOrbInput } from "@/lib/jarvis/orb-input"
import { createJarvisSession, type SavedSession } from "@/lib/jarvis/session"

/** The live view of one Session: a saved one to resume, or a new one. */
export function useJarvisSession(saved?: SavedSession) {
  const [session] = useState(() =>
    createJarvisSession(createBrowserAdapters(), saved)
  )
  const [orbInput] = useState(() => createOrbInput(session))
  // Leaving the Session (opening another, or another page) silences it and
  // stops following the Browse Task, which the next Session picks up.
  useEffect(() => {
    session.watchBrowse()
    return () => session.teardown()
  }, [session])
  // Inside the Jarvis App, its Push-to-talk and Jarvis State go through here.
  useEffect(
    () => connectAppBridge({ session, orbInput, app: window.jarvisApp }),
    [session, orbInput]
  )
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot
  )
  return { session, orbInput, ...snapshot }
}
