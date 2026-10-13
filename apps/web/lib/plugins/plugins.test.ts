import { tool, type ToolSet } from "ai"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { ConnectorAuthError, type Connector } from "./connector"
import { openDatabase } from "./db"
import { OAuthAuthError, type OAuthClient, type OAuthTokens } from "./oauth"
import { createPlugins } from "./plugins"
import { createSqliteStore } from "./store"

const googleCredentials = {
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
}

const redirectUri = "http://localhost:3000/api/plugins/callback"

const NOW = new Date("2026-10-13T10:00:00Z")

const HOUR = 3600_000

function fakeOAuth(
  options: {
    exchange?: OAuthTokens | Error
    refresh?: OAuthTokens | Error
    revokeError?: Error
  } = {}
) {
  const exchanged: { code: string; redirectUri: string; clientId: string }[] =
    []
  const refreshed: string[] = []
  const revoked: string[] = []
  const oauth: OAuthClient = {
    async exchangeCode({ code, redirectUri, credentials }) {
      exchanged.push({ code, redirectUri, clientId: credentials.clientId })
      const result = options.exchange ?? {
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresAt: new Date(NOW.getTime() + HOUR),
      }
      if (result instanceof Error) throw result
      return result
    },
    async refresh({ refreshToken }) {
      refreshed.push(refreshToken)
      // Valid until NOW+3h, so it outlives the tests' "expired at +2h" clock.
      const result = options.refresh ?? {
        accessToken: "access-2",
        refreshToken: null,
        expiresAt: new Date(NOW.getTime() + 3 * HOUR),
      }
      if (result instanceof Error) throw result
      return result
    },
    async revoke({ token }) {
      revoked.push(token)
      if (options.revokeError) throw options.revokeError
    },
  }
  return { oauth, exchanged, refreshed, revoked }
}

/** A Gmail MCP server's tools, read and write, as the Connector returns them. */
const GMAIL_SERVER_TOOLS = [
  "search_threads",
  "get_thread",
  "get_message",
  "list_labels",
  "list_drafts",
  "create_draft",
  "label_thread",
]

function fakeConnector(
  options: {
    serverTools?: string[]
    connectError?: Error
    toolError?: Error
    /** Access tokens the server answers with 401. */
    rejectedTokens?: string[]
  } = {}
) {
  const serverTools = options.serverTools ?? GMAIL_SERVER_TOOLS
  const connections: { url: string; accessToken: string }[] = []
  const toolCalls: { name: string; input: unknown }[] = []
  let closed = 0
  const connector: Connector = {
    async connect({ url, accessToken }) {
      connections.push({ url, accessToken })
      if (options.connectError) throw options.connectError
      if (options.rejectedTokens?.includes(accessToken)) {
        throw new ConnectorAuthError("HTTP 401")
      }
      const tools: ToolSet = Object.fromEntries(
        serverTools.map((name) => [
          name,
          tool({
            description: `Gmail ${name}`,
            inputSchema: z.object({ query: z.string().optional() }),
            execute: async (input) => {
              toolCalls.push({ name, input })
              if (options.toolError) throw options.toolError
              return { threads: [{ sender: "Ana", subject: "Hola" }] }
            },
          }),
        ])
      )
      return {
        tools: async () => tools,
        close: async () => {
          closed++
        },
      }
    },
  }
  return { connector, connections, toolCalls, closed: () => closed }
}

function setup(
  options: {
    env?: Record<string, string | undefined>
    oauth?: ReturnType<typeof fakeOAuth>
    connector?: ReturnType<typeof fakeConnector>
  } = {}
) {
  const store = createSqliteStore(openDatabase(":memory:"))
  const oauth = options.oauth ?? fakeOAuth()
  const connector = options.connector ?? fakeConnector()
  const clock = { now: NOW }
  const plugins = createPlugins({
    env: options.env ?? googleCredentials,
    store,
    oauth: oauth.oauth,
    connector: connector.connector,
    now: () => clock.now,
  })
  return { plugins, store, oauth, connector, clock }
}

/** Calls a tool the way the AI SDK does during a Turn. */
async function callTool(tools: ToolSet, name: string, input: unknown) {
  const execute = tools[name]?.execute
  if (!execute) throw new Error(`no tool ${name}`)
  return execute(input, { toolCallId: "call-1", messages: [], context: {} })
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

      expect(await installGmail(plugins)).toEqual({
        ok: true,
        pluginId: "gmail",
      })

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
        connector: fakeConnector().connector,
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

      expect(result).toEqual({
        ok: false,
        pluginId: "gmail",
        reason: "cancelled",
      })
      expect(oauth.exchanged).toEqual([])
      expect(await gmailState(plugins)).toBe("installable")
    })

    it("cancelling consent is reported as cancelled even without a state", async () => {
      const { plugins, oauth } = setup()
      const begun = await plugins.beginInstall("gmail", { redirectUri })
      if (!begun.ok) throw new Error("expected Install to begin")

      const result = await plugins.completeInstall({
        pending: begun.pending,
        redirectUri,
        callback: { error: "access_denied" },
      })

      expect(result).toEqual({
        ok: false,
        pluginId: "gmail",
        reason: "cancelled",
      })
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

  describe("Tools for a Turn", () => {
    it("offers no tools when nothing is Installed", async () => {
      const { plugins, connector } = setup()

      const turn = await plugins.toolsForTurn()

      expect(turn.tools).toEqual({})
      expect(connector.connections).toEqual([])
    })

    it("offers only the allowlisted tools of a Connected Plugin", async () => {
      const { plugins, connector } = setup()
      await installGmail(plugins)

      const turn = await plugins.toolsForTurn()

      expect(Object.keys(turn.tools).sort()).toEqual([
        "gmail_get_message",
        "gmail_get_thread",
        "gmail_list_drafts",
        "gmail_list_labels",
        "gmail_search_threads",
      ])
      expect(connector.connections).toEqual([
        {
          url: "https://gmailmcp.googleapis.com/mcp/v1",
          accessToken: "access-1",
        },
      ])
    })

    it("skips allowlisted tools the server doesn't expose", async () => {
      const { plugins } = setup({
        connector: fakeConnector({
          serverTools: ["search_threads", "create_draft"],
        }),
      })
      await installGmail(plugins)

      const turn = await plugins.toolsForTurn()

      expect(Object.keys(turn.tools)).toEqual(["gmail_search_threads"])
    })

    it("calling a tool reaches the Connector's tool", async () => {
      const { plugins, connector } = setup()
      await installGmail(plugins)
      const turn = await plugins.toolsForTurn()

      const result = await callTool(turn.tools, "gmail_search_threads", {
        query: "is:unread newer_than:1d",
      })

      expect(result).toEqual({ threads: [{ sender: "Ana", subject: "Hola" }] })
      expect(connector.toolCalls).toEqual([
        { name: "search_threads", input: { query: "is:unread newer_than:1d" } },
      ])
    })

    it("closes its Connector sessions when the Turn ends", async () => {
      const { plugins, connector } = setup()
      await installGmail(plugins)
      const turn = await plugins.toolsForTurn()

      await turn.close()

      expect(connector.closed()).toBe(1)
    })
  })

  describe("Failures and Reconnect", () => {
    it("refreshes an expired access token and stores the new one", async () => {
      const { plugins, oauth, connector, clock } = setup()
      await installGmail(plugins)
      clock.now = new Date(NOW.getTime() + 2 * HOUR)

      await plugins.toolsForTurn()
      await plugins.toolsForTurn()

      expect(oauth.refreshed).toEqual(["refresh-1"])
      expect(connector.connections.map((c) => c.accessToken)).toEqual([
        "access-2",
        "access-2",
      ])
      expect(await gmailState(plugins)).toBe("connected")
    })

    it("keeps the refresh token when the provider doesn't rotate it", async () => {
      const { plugins, oauth, clock } = setup()
      await installGmail(plugins)
      clock.now = new Date(NOW.getTime() + 2 * HOUR)
      await plugins.toolsForTurn()

      clock.now = new Date(NOW.getTime() + 4 * HOUR)
      await plugins.toolsForTurn()

      expect(oauth.refreshed).toEqual(["refresh-1", "refresh-1"])
    })

    it("refreshes a token about to expire rather than using it mid-Turn", async () => {
      const { plugins, oauth, clock } = setup()
      await installGmail(plugins)
      clock.now = new Date(NOW.getTime() + HOUR - 30_000)

      await plugins.toolsForTurn()

      expect(oauth.refreshed).toEqual(["refresh-1"])
    })

    it("a rejected refresh marks Gmail not Connected and tells the model", async () => {
      const { plugins, clock, connector } = setup({
        oauth: fakeOAuth({ refresh: new OAuthAuthError("invalid_grant") }),
      })
      await installGmail(plugins)
      clock.now = new Date(NOW.getTime() + 2 * HOUR)

      const turn = await plugins.toolsForTurn()

      expect(turn.tools).toEqual({})
      expect(connector.connections).toEqual([])
      expect(turn.notices).toHaveLength(1)
      expect(turn.notices[0]).toMatch(/Gmail/)
      expect(turn.notices[0]).toMatch(/reconect/i)
      expect(await gmailState(plugins)).toBe("reconnect")
    })

    it("a refresh that fails for another reason keeps Gmail Connected and tells the model", async () => {
      const { plugins, clock } = setup({
        oauth: fakeOAuth({ refresh: new Error("network down") }),
      })
      await installGmail(plugins)
      clock.now = new Date(NOW.getTime() + 2 * HOUR)

      const turn = await plugins.toolsForTurn()

      expect(turn.tools).toEqual({})
      expect(turn.notices).toHaveLength(1)
      expect(turn.notices[0]).toMatch(/Gmail/)
      expect(await gmailState(plugins)).toBe("connected")
    })

    it("a Connector failing at tool-load tells the model instead of throwing", async () => {
      const { plugins } = setup({
        connector: fakeConnector({ connectError: new Error("HTTP 503") }),
      })
      await installGmail(plugins)

      const turn = await plugins.toolsForTurn()

      expect(turn.tools).toEqual({})
      expect(turn.notices).toHaveLength(1)
      expect(turn.notices[0]).toMatch(/Gmail/)
      expect(await gmailState(plugins)).toBe("connected")
    })

    it("a Connector rejecting the token at tool-load marks Gmail not Connected", async () => {
      const { plugins } = setup({
        connector: fakeConnector({
          connectError: new ConnectorAuthError("HTTP 401"),
        }),
      })
      await installGmail(plugins)

      const turn = await plugins.toolsForTurn()

      expect(turn.tools).toEqual({})
      expect(turn.notices[0]).toMatch(/reconect/i)
      expect(await gmailState(plugins)).toBe("reconnect")
    })

    it("a token rejected at tool-load is refreshed once before giving up", async () => {
      const { plugins, oauth, connector } = setup({
        connector: fakeConnector({ rejectedTokens: ["access-1"] }),
      })
      await installGmail(plugins)

      const turn = await plugins.toolsForTurn()

      expect(oauth.refreshed).toEqual(["refresh-1"])
      expect(connector.connections.map((c) => c.accessToken)).toEqual([
        "access-1",
        "access-2",
      ])
      expect(Object.keys(turn.tools)).toContain("gmail_search_threads")
      expect(turn.notices).toEqual([])
      expect(await gmailState(plugins)).toBe("connected")
    })

    it("a token still rejected after refreshing marks Gmail not Connected", async () => {
      const { plugins, oauth } = setup({
        connector: fakeConnector({ rejectedTokens: ["access-1", "access-2"] }),
      })
      await installGmail(plugins)

      const turn = await plugins.toolsForTurn()

      expect(oauth.refreshed).toEqual(["refresh-1"])
      expect(turn.notices[0]).toMatch(/reconect/i)
      expect(await gmailState(plugins)).toBe("reconnect")
    })

    it("a tool call failing returns an explanation for the model instead of throwing", async () => {
      const { plugins } = setup({
        connector: fakeConnector({ toolError: new Error("HTTP 500") }),
      })
      await installGmail(plugins)
      const turn = await plugins.toolsForTurn()

      const result = await callTool(turn.tools, "gmail_search_threads", {})

      expect(result).toEqual({ error: expect.stringMatching(/Gmail/) })
      expect(await gmailState(plugins)).toBe("connected")
    })

    it("a tool call rejected for auth marks Gmail not Connected", async () => {
      const { plugins } = setup({
        connector: fakeConnector({
          toolError: new ConnectorAuthError("HTTP 401"),
        }),
      })
      await installGmail(plugins)
      const turn = await plugins.toolsForTurn()

      const result = await callTool(turn.tools, "gmail_search_threads", {})

      expect(result).toEqual({ error: expect.stringMatching(/reconect/i) })
      expect(await gmailState(plugins)).toBe("reconnect")
    })

    it("a Plugin needing Reconnect offers no tools and tells the model", async () => {
      const { plugins, connector, clock } = setup({
        oauth: fakeOAuth({ refresh: new OAuthAuthError("invalid_grant") }),
      })
      await installGmail(plugins)
      clock.now = new Date(NOW.getTime() + 2 * HOUR)
      await plugins.toolsForTurn()

      const turn = await plugins.toolsForTurn()

      expect(turn.tools).toEqual({})
      expect(connector.connections).toEqual([])
      expect(turn.notices).toHaveLength(1)
      expect(turn.notices[0]).toMatch(/reconect/i)
    })

    it("Reconnect runs OAuth again and restores Connected", async () => {
      const { plugins } = setup({
        connector: fakeConnector({
          connectError: new ConnectorAuthError("HTTP 401"),
        }),
      })
      await installGmail(plugins)
      await plugins.toolsForTurn()
      expect(await gmailState(plugins)).toBe("reconnect")

      expect(await installGmail(plugins)).toEqual({
        ok: true,
        pluginId: "gmail",
      })

      expect(await gmailState(plugins)).toBe("connected")
    })

    it("a healthy Turn has no notices", async () => {
      const { plugins } = setup()
      await installGmail(plugins)

      const turn = await plugins.toolsForTurn()

      expect(turn.notices).toEqual([])
    })
  })

  describe("Uninstall", () => {
    it("removes Gmail and revokes its authorization with the provider", async () => {
      const { plugins, oauth } = setup()
      await installGmail(plugins)

      await plugins.uninstall("gmail")

      expect(oauth.revoked).toEqual(["refresh-1"])
      expect(await gmailState(plugins)).toBe("installable")
    })

    it("still uninstalls when revocation fails", async () => {
      const { plugins, oauth } = setup({
        oauth: fakeOAuth({ revokeError: new Error("HTTP 500") }),
      })
      await installGmail(plugins)

      await plugins.uninstall("gmail")

      expect(oauth.revoked).toEqual(["refresh-1"])
      expect(await gmailState(plugins)).toBe("installable")
    })

    it("revokes the access token when there is no refresh token", async () => {
      const { plugins, oauth } = setup({
        oauth: fakeOAuth({
          exchange: {
            accessToken: "access-1",
            refreshToken: null,
            expiresAt: null,
          },
        }),
      })
      await installGmail(plugins)

      await plugins.uninstall("gmail")

      expect(oauth.revoked).toEqual(["access-1"])
    })

    it("leaves Jarvis without Gmail's tools", async () => {
      const { plugins } = setup()
      await installGmail(plugins)

      await plugins.uninstall("gmail")
      const turn = await plugins.toolsForTurn()

      expect(turn.tools).toEqual({})
      expect(turn.notices).toEqual([])
    })

    it("can install Gmail again afterwards", async () => {
      const { plugins } = setup()
      await installGmail(plugins)
      await plugins.uninstall("gmail")

      await installGmail(plugins)

      expect(await gmailState(plugins)).toBe("connected")
    })

    it("does nothing for a Plugin that isn't Installed", async () => {
      const { plugins, oauth } = setup()

      await plugins.uninstall("gmail")

      expect(oauth.revoked).toEqual([])
      expect(await gmailState(plugins)).toBe("installable")
    })
  })
})
