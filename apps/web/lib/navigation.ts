import { AudioLinesIcon, BlocksIcon, type LucideIcon } from "lucide-react"

export type Page = {
  href: string
  label: string
  icon: LucideIcon
}

// The pages the sidebar links to, in order. A new page only needs an entry here.
export const PAGES: readonly Page[] = [
  { href: "/", label: "Jarvis", icon: AudioLinesIcon },
  { href: "/plugins", label: "Plugins", icon: BlocksIcon },
]

// Jarvis owns home and every Session; any other page owns the paths below it.
export function isCurrentPage(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/sessions/")
  return pathname === href || pathname.startsWith(`${href}/`)
}
