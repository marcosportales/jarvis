import type { Metadata } from "next"

import { FloatingOrb } from "@/components/floating-orb"

// The Jarvis App also fixes its window's title to this, which Hyprland's
// window rule for the Floating Orb matches.
export const metadata: Metadata = {
  title: "Jarvis Floating Orb",
}

/**
 * The Floating Orb page, for the Jarvis App's Floating Orb window. Nothing
 * links to it; in a browser tab it's an Orb that does nothing.
 */
export default function FloatingOrbPage() {
  return <FloatingOrb />
}
