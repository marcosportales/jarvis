"use client"

// PROTOTYPE — throwaway. Floating bar that cycles `?variant=` on the current route.

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

import { isTypingTarget } from "@/lib/is-typing-target"

export function PrototypeSwitcher({
  variants,
  current,
  status,
}: {
  variants: readonly { key: string; name: string }[]
  current: string
  /** Extra state to surface next to the variant label. */
  status?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current)
  )

  function go(step: number) {
    const next = variants[(index + step + variants.length) % variants.length]!
    router.replace(`${pathname}?variant=${next.key}`, { scroll: false })
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return
      if (event.key === "ArrowLeft") go(-1)
      if (event.key === "ArrowRight") go(1)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  if (process.env.NODE_ENV === "production") return null
  const variant = variants[index]!
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-fuchsia-600 px-2 py-1 text-xs font-medium text-white shadow-lg max-sm:top-2 max-sm:bottom-auto">
      <button
        type="button"
        aria-label="Variante anterior"
        className="cursor-pointer rounded-full p-1 hover:bg-white/20"
        onClick={() => go(-1)}
      >
        <ChevronLeftIcon className="size-4" />
      </button>
      <span className="whitespace-nowrap">
        {variant.key} ({variant.name})
        {status && <span className="opacity-75"> · {status}</span>}
      </span>
      <button
        type="button"
        aria-label="Variante siguiente"
        className="cursor-pointer rounded-full p-1 hover:bg-white/20"
        onClick={() => go(1)}
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  )
}
