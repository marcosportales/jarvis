"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { returnToJarvisOnPushToTalk } from "@/lib/jarvis/app-bridge"

/**
 * For a page without a Session, e.g. the Marketplace: inside the Jarvis App,
 * Push-to-talk from any app or the Floating Orb goes back to the Jarvis page
 * and holds Push-to-talk there, instead of doing nothing.
 */
export function PushToTalkReturnsToJarvis() {
  const router = useRouter()

  useEffect(
    () =>
      returnToJarvisOnPushToTalk({
        app: window.jarvisApp,
        goToJarvisPage: () => router.push("/"),
      }),
    [router]
  )

  return null
}
