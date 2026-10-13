import { describe, expect, it } from "vitest"

import { openDatabase } from "./db"
import type { OAuthClient, OAuthTokens } from "./oauth"
import { createPlugins } from "./plugins"
import { createSqliteStore } from "./store"

const googleCredentials = {
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
}

const redirectUri = "http://localhost:3000/api/plugins/callback"

const NOW = new Date("2026-10-13T10:00:00Z")

function fakeOAuth(
  options: { exchange?: OAuthTokens | Error } = {}
) {
  const exchanged: { code: string; redirectUri: string; clientId: string }[] =
    []
  const oauth: OAuthClient = {
    async exchangeCode({ code, redirectUri, credentials }) {
      exchanged.push({ code, redirectUri, clientId: credentials.clientId })
      const result = options.exchange ?? {
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresAt: new Date(NOW.getTime() + 3600_000),
      }
      if (result instanceof Error) throw result
      return result
    },
    async refresh() {
      throw new Error("not expected")
    },
    async revoke() {},
  }
  return { oauth, exchanged }
}

function setup(
  options: {
    env?: Record<string, string | undefined>
    oauth?: ReturnType<typeof fakeOAuth>
  } = {}
) {
  const store = createSqliteStore(openDatabase(":memory:"))
  const oauth = options.oauth ?? fakeOAuth()
  const plugins = createPlugins({
    env: options.env ?? googleCredentials,
    store,
    oauth: oauth.oauth,
    now: () => NOW,
  })
  return { plugins, store, oauth }
}

async function gmailState(plugins: ReturnType<typeof setup>["plugins"]) {
  const items = await plugins.listMarketplace()
  return items.find((item) => item.id === "gmail")?.state
}

/** Runs Install through the consent screen, approving it. */
async function installGmail(plugins: ReturnType<typeof setup>["plugins"]) {
  const begun = await plugins.beginInstall("gmail", { redirectUri })
  if (!begun.ok) throw new Error(begun.reason)
  return plugins.completeInstall({
    pending: begun.pending,
    redirectUri,
    callback: { code: "auth-code", state: begun.pending.state },
  })
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

  describe("Install", () => {
    it("sends the Owner to Google's consent screen with the read-only scope and a state", async () => {
      const { plugins } = setup()

      const begun = await plugins.beginInstall("gmail", { redirectUri })

      if (!begun.ok) throw new Error("expected Install to begin")
      const url = new URL(begun.authorizationUrl)
      expect(url.origin + url.pathname).toBe(
        "https://accounts.google.com/o/oauth2/v2/auth"
      )
      expect(Object.fromEntries(url.searchParams)).toEqual({
        client_id: "client-id",
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/gmail.readonly",
        state: begun.pending.state,
        access_type: "offline",
        prompt: "consent",
      })
      expect(begun.pending.pluginId).toBe("gmail")
      expect(begun.pending.state.length).toBeGreaterThanOrEqual(32)
    })

    it("uses a fresh state for every Install", async () => {
      const { plugins } = setup()

      const first = await plugins.beginInstall("gmail", { redirectUri })
      const second = await plugins.beginInstall("gmail", { redirectUri })

      if (!first.ok || !second.ok) throw new Error("expected Install to begin")
      expect(first.pending.state).not.toBe(second.pending.state)
    })

    it("refuses to begin Install when the Plugin is not configured", async () => {
      const { plugins } = setup({ env: {} })

      expect(await plugins.beginInstall("gmail", { redirectUri })).toEqual({
        ok: false,
        reason: "not-configured",
      })
    })

    it("refuses to begin Install for a Plugin not in the Marketplace", async () => {
      const { plugins } = setup()

      expect(await plugins.beginInstall("slack", { redirectUri })).toEqual({
        ok: false,
        reason: "unknown-plugin",
      })
    })

    it("approving consent makes Gmail Installed and Connected", async () => {
      const { plugins, oauth } = setup()

      expect(await installGmail(plugins)).toEqual({ ok: true, pluginId: "gmail" })

      expect(oauth.exchanged).toEqual([
        { code: "auth-code", redirectUri, clientId: "client-id" },
      ])
      expect(await gmailState(plugins)).toBe("connected")
    })

    it("stays Connected after a restart", async () => {
      const { plugins, store, oauth } = setup()
      await installGmail(plugins)

      const restarted = createPlugins({
        env: googleCredentials,
        store,
        oauth: oauth.oauth,
      })

      expect(await gmailState(restarted)).toBe("connected")
    })

    it("cancelling consent leaves Gmail not Installed", async () => {
      const { plugins, oauth } = setup()
      const begun = await plugins.beginInstall("gmail", { redirectUri })
      if (!begun.ok) throw new Error("expected Install to begin")

      const result = await plugins.completeInstall({
        pending: begun.pending,
        redirectUri,
        callback: { error: "access_denied", state: begun.pending.state },
      })

      expect(result).toEqual({ ok: false, pluginId: "gmail", reason: "cancelled" })
      expect(oauth.exchanged).toEqual([])
      expect(await gmailState(plugins)).toBe("installable")
    })

    it("a mismatched state leaves Gmail not Installed", async () => {
      const { plugins, oauth } = setup()
      const begun = await plugins.beginInstall("gmail", { redirectUri })
      if (!begun.ok) throw new Error("expected Install to begin")

      const result = await plugins.completeInstall({
        pending: begun.pending,
        redirectUri,
        callback: { code: "auth-code", state: "forged" },
      })

      expect(result).toEqual({
        ok: false,
        pluginId: "gmail",
        reason: "invalid-state",
      })
      expect(oauth.exchanged).toEqual([])
      expect(await gmailState(plugins)).toBe("installable")
    })

    it("a missing pending Install is an invalid state", async () => {
      const { plugins } = setup()

      const result = await plugins.completeInstall({
        pending: undefined,
        redirectUri,
        callback: { code: "auth-code", state: "anything" },
      })

      expect(result).toEqual({ ok: false, reason: "invalid-state" })
      expect(await gmailState(plugins)).toBe("installable")
    })

    it("a failed code exchange leaves Gmail not Installed", async () => {
      const { plugins } = setup({
        oauth: fakeOAuth({ exchange: new Error("invalid_client") }),
      })

      expect(await installGmail(plugins)).toEqual({
        ok: false,
        pluginId: "gmail",
        reason: "failed",
      })
      expect(await gmailState(plugins)).toBe("installable")
    })
  })
})
