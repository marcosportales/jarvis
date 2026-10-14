/** A fake Composio and a fake Connector, for tests of Plugins and Turns. */

import { tool, type ToolSet } from "ai"
import { z } from "zod"

import type { ComposioPort, ConnectedAccount } from "./composio"
import type { Connector } from "./connector"

export const GMAIL_TOOLS = [
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
export function fakeComposio(
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
  /** Each consent screen opened, as the provider would see it. */
  const consents: { connectedAccountId: string; state: string }[] = []
  const sessions: Record<string, string[]>[] = []
  let unreachable = options.unreachable ?? false
  const reach = () => {
    if (unreachable) throw new Error("ECONNREFUSED")
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
      consents.push({
        connectedAccountId,
        state: new URL(callbackUrl).searchParams.get("state") ?? "",
      })
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
    consents,
    sessions,
    /** From now on, every call fails as if Composio couldn't be reached. */
    goOffline() {
      unreachable = true
    },
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

/** A Connector serving Gmail tools, recording connections, tool calls and closes. */
export function fakeConnector(
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
