"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * Re-reads the Marketplace when the Owner comes back to this window. A
 * consent screen may finish in another browser (the Jarvis App sends it to
 * the Owner's own), so a Plugin can turn Connected while this page sits idle.
 */
export function RefreshOnReturn() {
  const router = useRouter()

  useEffect(() => {
    // Coming back usually fires both focus and visibilitychange: refresh once.
    let last = 0
    function refresh() {
      if (document.visibilityState !== "visible") return
      const now = Date.now()
      if (now - last < 1000) return
      last = now
      router.refresh()
    }
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [router])

  return null
}
