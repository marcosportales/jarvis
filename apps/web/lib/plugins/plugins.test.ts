import { tool, type ToolSet } from "ai"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import type { ComposioPort, ConnectedAccount } from "./composio"
import type { Connector } from "./connector"
import { createPlugins } from "./plugins"

const redirectUri = "http://localhost:3000/api/plugins/callback"

const GMAIL_TOOLS = [
  "GMAIL_FETCH_EMAILS",
  "GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID",
  "GMAIL_FETCH_MESSAGE_BY_THREAD_ID",
  "GMAIL_LIST_DRAFTS",
  "GMAIL_LIST_LABELS",
]

/**
 * Composio as the Owner's record of connected accounts. Consent is simulated
 * with `finishConsent`, which sets the status the provider left the account in.
 */
function fakeComposio(
  options: {
    accounts?: Omit<ConnectedAccount, "id">[]
    unreachable?: boolean
    sessionError?: Error
    deleteError?: Error
  } = {}
) {
  let nextId = 1
  const accounts = new Map<string, ConnectedAccount>()
  const add = (account: Omit<ConnectedAccount, "id">) => {
    const id = `ca_${nextId++}`
    accounts.set(id, { id, ...account })
    return id
  }
  for (const account of options.accounts ?? []) add(account)
  const callbackUrls: string[] = []
  const sessions: Record<string, string[]>[] = []
  const reach = () => {
    if (options.unreachable) throw new Error("ECONNREFUSED")
  }

  const composio: ComposioPort = {
    async listAccounts(toolkits) {
      reach()
      return [...accounts.values()].filter((a) => toolkits.includes(a.toolkit))
    },
    async authorize({ toolkit, callbackUrl }) {
      reach()
      callbackUrls.push(callbackUrl)
      const connectedAccountId = add({ toolkit, status: "INITIATED" })
      return {
        connectedAccountId,
        redirectUrl: `https://connect.composio.dev/link/${connectedAccountId}`,
      }
    },
    async getAccount(id) {
      reach()
      const account = accounts.get(id)
      if (!account) throw new Error(`no account ${id}`)
      return account
    },
    async deleteAccount(id) {
      reach()
      if (options.deleteError) throw options.deleteError
      accounts.delete(id)
    },
    async openSession({ tools }) {
      reach()
      if (options.sessionError) throw options.sessionError
      sessions.push(tools)
      return {
        url: "https://backend.composio.dev/tool_router/trs_1/mcp",
        headers: { "x-api-key": "composio-key" },
      }
    },
  }

  return {
    composio,
    callbackUrls,
    sessions,
    finishConsent(id: string, status: string) {
      const account = accounts.get(id)
      if (account) account.status = status
    },
    statuses: (toolkit = "gmail") =>
      [...accounts.values()]
        .filter((a) => a.toolkit === toolkit)
        .map((a) => a.status),
  }
}

/** Gmail tools as Composio's session serves them, read and write. */
const SESSION_TOOLS = [...GMAIL_TOOLS, "GMAIL_SEND_EMAIL", "GMAIL_DELETE_DRAFT"]

function fakeConnector(
  options: {
    serverTools?: string[]
    connectError?: Error
    toolError?: Error
  } = {}
) {
  const serverTools = options.serverTools ?? SESSION_TOOLS
  const connections: { url: string; headers: Record<string, string> }[] = []
  const toolCalls: { name: string; input: unknown }[] = []
  let closed = 0
  const connector: Connector = {
    async connect({ url, headers }) {
      connections.push({ url, headers })
      if (options.connectError) throw options.connectError
      const tools: ToolSet = Object.fromEntries(
        serverTools.map((name) => [
          name,
          tool({
            description: `Gmail ${name}`,
            inputSchema: z.object({ query: z.string().optional() }),
            execute: async (input) => {
              toolCalls.push({ name, input })
              if (options.toolError) throw options.toolError
              return { messages: [{ sender: "Ana", subject: "Hola" }] }
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
    composio?: ReturnType<typeof fakeComposio> | null
    connector?: ReturnType<typeof fakeConnector>
  } = {}
) {
  const composio =
    options.composio === null ? null : (options.composio ?? fakeComposio())
  const connector = options.connector ?? fakeConnector()
  const plugins = createPlugins({
    composio: composio?.composio ?? null,
    connector: connector.connector,
  })
  return { plugins, composio: composio!, connector }
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

/**
 * Runs Install through the consent screen: the provider leaves the account in
 * `status`, and Composio sends the Owner back with `callback`.
 */
async function installGmail(
  { plugins, composio }: ReturnType<typeof setup>,
  {
    status = "ACTIVE",
    callback,
  }: {
    status?: string
    callback?: (state: string) => Record<string, string>
  } = {}
) {
  const begun = await plugins.beginInstall("gmail", { redirectUri })
  if (!begun.ok) throw new Error(begun.reason)
  composio.finishConsent(begun.pending.connectedAccountId, status)
  const state = begun.pending.state
  return plugins.completeInstall({
    pending: begun.pending,
    callback: callback?.(state) ?? {
      state,
      status: status === "ACTIVE" ? "success" : "failed",
    },
  })
}

describe("Plugins", () => {
  describe("Marketplace", () => {
    it("lists Gmail as not configured when the Composio API key is missing", async () => {
      const { plugins } = setup({ composio: null })

      expect(await plugins.listMarketplace()).toEqual([
        {
          id: "gmail",
          name: "Gmail",
          icon: "/plugins/gmail.svg",
          state: "not-configured",
        },
      ])
    })

    it("lists Gmail as installable when it has no connected accounts", async () => {
      const { plugins } = setup()

      expect(await gmailState(plugins)).toBe("installable")
    })

    it.each(["INITIATED", "INITIALIZING"])(
      "lists Gmail as installable when its only account is %s",
      async (status) => {
        const { plugins } = setup({
          composio: fakeComposio({ accounts: [{ toolkit: "gmail", status }] }),
        })

        expect(await gmailState(plugins)).toBe("installable")
      }
    )

    it("lists Gmail as connected when any account is ACTIVE", async () => {
      const { plugins } = setup({
        composio: fakeComposio({
          accounts: [
            { toolkit: "gmail", status: "EXPIRED" },
            { toolkit: "gmail", status: "ACTIVE" },
          ],
        }),
      })

      expect(await gmailState(plugins)).toBe("connected")
    })

    it.each(["EXPIRED", "FAILED", "INACTIVE", "REVOKED"])(
      "lists Gmail as needing Reconnect when its account is %s",
      async (status) => {
        const { plugins } = setup({
          composio: fakeComposio({
            accounts: [
              { toolkit: "gmail", status: "INITIATED" },
              { toolkit: "gmail", status },
            ],
          }),
        })

        expect(await gmailState(plugins)).toBe("reconnect")
      }
    )

    it("ignores accounts of toolkits outside the Marketplace", async () => {
      const { plugins } = setup({
        composio: fakeComposio({
          accounts: [{ toolkit: "slack", status: "ACTIVE" }],
        }),
      })

      expect(await gmailState(plugins)).toBe("installable")
    })

    it("fails to list when Composio can't be reached", async () => {
      const { plugins } = setup({
        composio: fakeComposio({ unreachable: true }),
      })

      await expect(plugins.listMarketplace()).rejects.toThrow()
    })
  })

  describe("Install", () => {
    it("sends the Owner to Composio's consent URL with a state in the callback", async () => {
      const { plugins, composio } = setup()

      const begun = await plugins.beginInstall("gmail", { redirectUri })

      if (!begun.ok) throw new Error("expected Install to begin")
      expect(begun.authorizationUrl).toBe(
        `https://connect.composio.dev/link/${begun.pending.connectedAccountId}`
      )
      expect(begun.pending.pluginId).toBe("gmail")
      expect(begun.pending.state.length).toBeGreaterThanOrEqual(32)
      const callback = new URL(composio.callbackUrls[0]!)
      expect(callback.origin + callback.pathname).toBe(redirectUri)
      expect(callback.searchParams.get("state")).toBe(begun.pending.state)
    })

    it("uses a fresh state for every Install", async () => {
      const { plugins } = setup()

      const first = await plugins.beginInstall("gmail", { redirectUri })
      const second = await plugins.beginInstall("gmail", { redirectUri })

      if (!first.ok || !second.ok) throw new Error("expected Install to begin")
      expect(first.pending.state).not.toBe(second.pending.state)
    })

    it("an Install opened but never finished doesn't count as Installed", async () => {
      const { plugins } = setup()

      await plugins.beginInstall("gmail", { redirectUri })

      expect(await gmailState(plugins)).toBe("installable")
    })

    it("refuses to begin Install when Composio is not configured", async () => {
      const { plugins } = setup({ composio: null })

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

    it("fails to begin Install when Composio can't be reached", async () => {
      const { plugins } = setup({
        composio: fakeComposio({ unreachable: true }),
      })

      expect(await plugins.beginInstall("gmail", { redirectUri })).toEqual({
        ok: false,
        reason: "failed",
      })
    })

    it("approving consent makes Gmail Installed and Connected", async () => {
      const harness = setup()

      expect(await installGmail(harness)).toEqual({
        ok: true,
        pluginId: "gmail",
      })

      expect(await gmailState(harness.plugins)).toBe("connected")
    })

    it("cancelling consent leaves Gmail not Installed and cleans up", async () => {
      const harness = setup()

      const result = await installGmail(harness, { status: "INITIATED" })

      expect(result).toEqual({
        ok: false,
        pluginId: "gmail",
        reason: "cancelled",
      })
      expect(harness.composio.statuses()).toEqual([])
      expect(await gmailState(harness.plugins)).toBe("installable")
    })

    it("a failed authorization leaves Gmail not Installed and cleans up", async () => {
      const harness = setup()

      const result = await installGmail(harness, { status: "FAILED" })

      expect(result).toEqual({
        ok: false,
        pluginId: "gmail",
        reason: "failed",
      })
      expect(harness.composio.statuses()).toEqual([])
      expect(await gmailState(harness.plugins)).toBe("installable")
    })

    it("only an ACTIVE account counts, whatever the callback claims", async () => {
      const harness = setup()

      const result = await installGmail(harness, {
        status: "INITIATED",
        callback: (state) => ({ state, status: "success" }),
      })

      expect(result).toMatchObject({ ok: false, reason: "cancelled" })
      expect(await gmailState(harness.plugins)).toBe("installable")
    })

    it("a mismatched state is rejected and changes nothing", async () => {
      const harness = setup()

      const result = await installGmail(harness, {
        callback: () => ({ state: "forged", status: "success" }),
      })

      expect(result).toEqual({
        ok: false,
        pluginId: "gmail",
        reason: "invalid-state",
      })
      expect(harness.composio.statuses()).toEqual(["ACTIVE"])
    })

    it("a missing pending Install is an invalid state", async () => {
      const { plugins } = setup()

      const result = await plugins.completeInstall({
        pending: undefined,
        callback: { state: "anything", status: "success" },
      })

      expect(result).toEqual({ ok: false, reason: "invalid-state" })
      expect(await gmailState(plugins)).toBe("installable")
    })

    it("fails when Composio can't be reached on the way back", async () => {
      const harness = setup()
      const begun = await harness.plugins.beginInstall("gmail", {
        redirectUri,
      })
      if (!begun.ok) throw new Error("expected Install to begin")
      const broken = setup({ composio: fakeComposio({ unreachable: true }) })

      const result = await broken.plugins.completeInstall({
        pending: begun.pending,
        callback: { state: begun.pending.state, status: "success" },
      })

      expect(result).toEqual({ ok: false, pluginId: "gmail", reason: "failed" })
    })
  })

  describe("Reconnect", () => {
    it("restores Connected and leaves a single working connection", async () => {
      const harness = setup({
        composio: fakeComposio({
          accounts: [
            { toolkit: "gmail", status: "EXPIRED" },
            { toolkit: "gmail", status: "INITIATED" },
            { toolkit: "slack", status: "ACTIVE" },
          ],
        }),
      })
      expect(await gmailState(harness.plugins)).toBe("reconnect")

      expect(await installGmail(harness)).toEqual({
        ok: true,
        pluginId: "gmail",
      })

      expect(await gmailState(harness.plugins)).toBe("connected")
      expect(harness.composio.statuses()).toEqual(["ACTIVE"])
      expect(harness.composio.statuses("slack")).toEqual(["ACTIVE"])
    })

    it("a cancelled Reconnect keeps the Plugin needing Reconnect", async () => {
      const harness = setup({
        composio: fakeComposio({
          accounts: [{ toolkit: "gmail", status: "EXPIRED" }],
        }),
      })

      await installGmail(harness, { status: "INITIATED" })

      expect(await gmailState(harness.plugins)).toBe("reconnect")
    })
  })

  describe("Tools for a Turn", () => {
    it("offers nothing when Composio is not configured", async () => {
      const { plugins, connector } = setup({ composio: null })

      const turn = await plugins.toolsForTurn()

      expect(turn.tools).toEqual({})
      expect(turn.notices).toEqual([])
      expect(connector.connections).toEqual([])
    })

    it("offers nothing and opens no session when nothing is Installed", async () => {
      const { plugins, composio, connector } = setup({
        composio: fakeComposio({
          accounts: [{ toolkit: "gmail", status: "INITIATED" }],
        }),
      })

      const turn = await plugins.toolsForTurn()

      expect(turn.tools).toEqual({})
      expect(turn.notices).toEqual([])
      expect(composio.sessions).toEqual([])
      expect(connector.connections).toEqual([])
    })

    it("offers only the allowlisted tools of a Connected Plugin, under Composio slugs", async () => {
      const harness = setup()
      await installGmail(harness)

      const turn = await harness.plugins.toolsForTurn()

      expect(Object.keys(turn.tools).sort()).toEqual(GMAIL_TOOLS)
      expect(turn.notices).toEqual([])
    })

    it("opens one session limited to the allowlist and connects with its headers", async () => {
      const harness = setup()
      await installGmail(harness)

      await harness.plugins.toolsForTurn()

      expect(harness.composio.sessions).toEqual([
        {
          gmail: [
            "GMAIL_FETCH_EMAILS",
            "GMAIL_FETCH_MESSAGE_BY_THREAD_ID",
            "GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID",
            "GMAIL_LIST_LABELS",
            "GMAIL_LIST_DRAFTS",
          ],
        },
      ])
      expect(harness.connector.connections).toEqual([
        {
          url: "https://backend.composio.dev/tool_router/trs_1/mcp",
          headers: { "x-api-key": "composio-key" },
        },
      ])
    })

    it("skips allowlisted tools the session doesn't serve", async () => {
      const harness = setup({
        connector: fakeConnector({
          serverTools: ["GMAIL_FETCH_EMAILS", "GMAIL_SEND_EMAIL"],
        }),
      })
      await installGmail(harness)

      const turn = await harness.plugins.toolsForTurn()

      expect(Object.keys(turn.tools)).toEqual(["GMAIL_FETCH_EMAILS"])
    })

    it("calling a tool reaches the session's tool", async () => {
      const harness = setup()
      await installGmail(harness)
      const turn = await harness.plugins.toolsForTurn()

      const result = await callTool(turn.tools, "GMAIL_FETCH_EMAILS", {
        query: "is:unread newer_than:1d",
      })

      expect(result).toEqual({ messages: [{ sender: "Ana", subject: "Hola" }] })
      expect(harness.connector.toolCalls).toEqual([
        {
          name: "GMAIL_FETCH_EMAILS",
          input: { query: "is:unread newer_than:1d" },
        },
      ])
    })

    it("closes its Connector session when the Turn ends", async () => {
      const harness = setup()
      await installGmail(harness)
      const turn = await harness.plugins.toolsForTurn()

      await turn.close()

      expect(harness.connector.closed()).toBe(1)
    })
  })

  describe("Failures", () => {
    it("a Plugin needing Reconnect offers no tools and tells the model", async () => {
      const { plugins, composio } = setup({
        composio: fakeComposio({
          accounts: [{ toolkit: "gmail", status: "EXPIRED" }],
        }),
      })

      const turn = await plugins.toolsForTurn()

      expect(turn.tools).toEqual({})
      expect(composio.sessions).toEqual([])
      expect(turn.notices).toHaveLength(1)
      expect(turn.notices[0]).toMatch(/Gmail/)
      expect(turn.notices[0]).toMatch(/reconect/i)
    })

    it("Composio failing to open the session tells the model instead of throwing", async () => {
      const harness = setup({
        composio: fakeComposio({ sessionError: new Error("HTTP 503") }),
      })
      await installGmail(harness)

      const turn = await harness.plugins.toolsForTurn()

      expect(turn.tools).toEqual({})
      expect(turn.notices).toHaveLength(1)
      expect(turn.notices[0]).toMatch(/Gmail/)
      expect(turn.notices[0]).not.toMatch(/reconect/i)
      expect(await gmailState(harness.plugins)).toBe("connected")
    })

    it("the Connector failing tells the model instead of throwing", async () => {
      const harness = setup({
        connector: fakeConnector({ connectError: new Error("HTTP 401") }),
      })
      await installGmail(harness)

      const turn = await harness.plugins.toolsForTurn()

      expect(turn.tools).toEqual({})
      expect(turn.notices).toHaveLength(1)
      expect(turn.notices[0]).toMatch(/Gmail/)
      expect(await gmailState(harness.plugins)).toBe("connected")
    })

    it("Composio unreachable at the start of a Turn tells the model instead of throwing", async () => {
      const { plugins } = setup({
        composio: fakeComposio({ unreachable: true }),
      })

      const turn = await plugins.toolsForTurn()

      expect(turn.tools).toEqual({})
      expect(turn.notices).toHaveLength(1)
      expect(turn.notices[0]).toMatch(/Plugins/)
    })

    it("a tool call failing returns an explanation for the model instead of throwing", async () => {
      const harness = setup({
        connector: fakeConnector({ toolError: new Error("HTTP 500") }),
      })
      await installGmail(harness)
      const turn = await harness.plugins.toolsForTurn()

      const result = await callTool(turn.tools, "GMAIL_FETCH_EMAILS", {})

      expect(result).toEqual({ error: expect.stringMatching(/Gmail/) })
      expect(await gmailState(harness.plugins)).toBe("connected")
    })
  })

  describe("Uninstall", () => {
    it("deletes every one of Gmail's connected accounts", async () => {
      const { plugins, composio } = setup({
        composio: fakeComposio({
          accounts: [
            { toolkit: "gmail", status: "ACTIVE" },
            { toolkit: "gmail", status: "INITIATED" },
            { toolkit: "slack", status: "ACTIVE" },
          ],
        }),
      })

      await plugins.uninstall("gmail")

      expect(composio.statuses()).toEqual([])
      expect(composio.statuses("slack")).toEqual(["ACTIVE"])
      expect(await gmailState(plugins)).toBe("installable")
    })

    it("works when Gmail needs Reconnect", async () => {
      const { plugins } = setup({
        composio: fakeComposio({
          accounts: [{ toolkit: "gmail", status: "EXPIRED" }],
        }),
      })

      await plugins.uninstall("gmail")

      expect(await gmailState(plugins)).toBe("installable")
    })

    it("leaves Jarvis without Gmail's tools", async () => {
      const harness = setup()
      await installGmail(harness)

      await harness.plugins.uninstall("gmail")
      const turn = await harness.plugins.toolsForTurn()

      expect(turn.tools).toEqual({})
      expect(turn.notices).toEqual([])
    })

    it("can install Gmail again afterwards", async () => {
      const harness = setup()
      await installGmail(harness)
      await harness.plugins.uninstall("gmail")

      await installGmail(harness)

      expect(await gmailState(harness.plugins)).toBe("connected")
    })

    it("fails rather than claiming success when Composio can't delete", async () => {
      const { plugins } = setup({
        composio: fakeComposio({
          accounts: [{ toolkit: "gmail", status: "ACTIVE" }],
          deleteError: new Error("HTTP 500"),
        }),
      })

      await expect(plugins.uninstall("gmail")).rejects.toThrow()
      expect(await gmailState(plugins)).toBe("connected")
    })
  })
})
