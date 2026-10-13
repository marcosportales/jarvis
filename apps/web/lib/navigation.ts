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

// Home matches only itself; any other page also owns the paths below it.
export function isCurrentPage(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}
