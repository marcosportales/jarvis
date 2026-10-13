import { describe, expect, it } from "vitest"

import { openDatabase } from "./db"
import { createPlugins } from "./plugins"
import { createSqliteStore } from "./store"

const googleCredentials = {
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
}

function setup(options: { env?: Record<string, string | undefined> } = {}) {
  const store = createSqliteStore(openDatabase(":memory:"))
  const plugins = createPlugins({
    env: options.env ?? googleCredentials,
    store,
  })
  return { plugins, store }
}

describe("Plugins", () => {
  describe("Marketplace", () => {
    it("lists Gmail as not configured when Google OAuth credentials are missing", async () => {
      const { plugins } = setup({ env: {} })

      expect(await plugins.listMarketplace()).toEqual([
        {
          id: "gmail",
          name: "Gmail",
          icon: "/plugins/gmail.svg",
          state: "not-configured",
        },
      ])
    })

    it("lists Gmail as not configured when only some credentials are present", async () => {
      const { plugins } = setup({ env: { GOOGLE_CLIENT_ID: "client-id" } })

      const [gmail] = await plugins.listMarketplace()
      expect(gmail?.state).toBe("not-configured")
    })

    it("lists Gmail as installable when Google OAuth credentials are present", async () => {
      const { plugins } = setup()

      const [gmail] = await plugins.listMarketplace()
      expect(gmail?.state).toBe("installable")
    })
  })
})
