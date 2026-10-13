"use client"

import { useState, useSyncExternalStore } from "react"

import { createBrowserAdapters } from "@/lib/jarvis/browser-adapters"
import { createJarvisSession } from "@/lib/jarvis/session"

/** One Jarvis Session per page load; reloading starts fresh. */
export function useJarvisSession() {
  const [session] = useState(() =>
    createJarvisSession(createBrowserAdapters())
  )
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot
  )
  return { session, ...snapshot }
}
