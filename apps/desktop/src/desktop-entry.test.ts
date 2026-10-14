import { describe, expect, it } from "vitest"

import { desktopEntry } from "./desktop-entry.js"

/** The `Exec` lines of a desktop entry. */
function execLines(entry: string) {
  return entry.split("\n").filter((line) => line.startsWith("Exec="))
}

describe("Jarvis's desktop entry", () => {
  it("launches Jarvis with the command, and quits it with --quit", () => {
    expect(execLines(desktopEntry(["/home/owner/.local/bin/jarvis"]))).toEqual([
      "Exec=/home/owner/.local/bin/jarvis %U",
      "Exec=/home/owner/.local/bin/jarvis --quit",
    ])
  })

  it("is the Jarvis app the Wayland app_id names", () => {
    const entry = desktopEntry(["jarvis"])
    expect(entry).toMatch(/^\[Desktop Entry\]\n/)
    expect(entry).toContain("\nName=Jarvis\n")
    expect(entry).toContain("\nType=Application\n")
    expect(entry).toContain("\nStartupWMClass=Jarvis\n")
  })

  it("quotes arguments with spaces, and escapes what quotes don't cover", () => {
    expect(
      execLines(desktopEntry(["/opt/My Apps/electron", '/src/a"b$c%d']))[0]
    ).toBe('Exec="/opt/My Apps/electron" "/src/a\\\\"b\\\\$c%%d" %U')
  })
})
