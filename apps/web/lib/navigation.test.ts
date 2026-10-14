import { describe, expect, it } from "vitest"

import { isCurrentPage, PAGES } from "./navigation"

describe("isCurrentPage", () => {
  it("marks Jarvis current on the home page and in any Session", () => {
    expect(isCurrentPage("/", "/")).toBe(true)
    expect(isCurrentPage("/sessions/abc", "/")).toBe(true)
    expect(isCurrentPage("/plugins", "/")).toBe(false)
  })

  it("does not mark Plugins current in a Session", () => {
    expect(isCurrentPage("/sessions/abc", "/plugins")).toBe(false)
  })

  it("marks a page current on its own path and any path below it", () => {
    expect(isCurrentPage("/plugins", "/plugins")).toBe(true)
    expect(isCurrentPage("/plugins/gmail", "/plugins")).toBe(true)
  })

  it("does not mistake a sibling path sharing a prefix for the page", () => {
    expect(isCurrentPage("/plugins-old", "/plugins")).toBe(false)
  })
})

describe("PAGES", () => {
  it("leads with Jarvis, then Plugins", () => {
    expect(PAGES.map((page) => [page.href, page.label])).toEqual([
      ["/", "Jarvis"],
      ["/plugins", "Plugins"],
    ])
  })

  it("marks exactly one page current for every listed path", () => {
    for (const { href } of PAGES) {
      const current = PAGES.filter((page) => isCurrentPage(href, page.href))
      expect(current.map((page) => page.href)).toEqual([href])
    }
  })
})
