import { Composio } from "@composio/core"

/**
 * One of the Owner's authorizations with a service, held by Composio. Named
 * after Composio's "connected account"; it may be broken (not Connected).
 */
export type ConnectedAccount = {
  id: string
  /** The Composio toolkit slug, e.g. `gmail`. */
  toolkit: string
  /** `ACTIVE`, `INITIATED`, `EXPIRED`, `FAILED`, `INACTIVE`, `REVOKED`… */
  status: string
}

/** What the Plugins module needs from Composio, the only record of Installs. */
export type ComposioPort = {
  /** The Owner's connected accounts for these toolkits, in every status. */
  listAccounts(toolkits: string[]): Promise<ConnectedAccount[]>
  /** Starts a consent flow; Composio creates an `INITIATED` account for it. */
  authorize(args: {
    toolkit: string
    callbackUrl: string
  }): Promise<{ connectedAccountId: string; redirectUrl: string }>
  getAccount(id: string): Promise<ConnectedAccount>
  deleteAccount(id: string): Promise<void>
  /**
   * A session serving only these tools (keyed by toolkit) over MCP, with
   * Composio's own session tools turned off.
   */
  openSession(args: {
    tools: Record<string, string[]>
  }): Promise<{ url: string; headers: Record<string, string> }>
}

/** Jarvis has a single Owner, so one constant Composio user id. */
export const OWNER_USER_ID = "jarvis-owner"

/** The real port over `@composio/core`, per the confirmed API in ticket 01. */
export function createComposioPort(apiKey: string): ComposioPort {
  const composio = new Composio({ apiKey })

  const toAccount = (account: {
    id: string
    status: string
    toolkit: { slug: string }
  }): ConnectedAccount => ({
    id: account.id,
    toolkit: account.toolkit.slug,
    status: account.status,
  })

  return {
    async listAccounts(toolkits) {
      const accounts: ConnectedAccount[] = []
      let cursor: string | undefined
      do {
        const page = await composio.connectedAccounts.list({
          userIds: [OWNER_USER_ID],
          toolkitSlugs: toolkits,
          cursor,
        })
        accounts.push(...page.items.map(toAccount))
        cursor = page.nextCursor ?? undefined
      } while (cursor)
      return accounts
    },

    async authorize({ toolkit, callbackUrl }) {
      // Composio-managed auth goes through a session's Connect Link; the
      // legacy initiate() path is retired for it.
      const session = await composio.sessions.create(OWNER_USER_ID, {
        toolkits: [toolkit],
        manageConnections: false,
      })
      const request = await session.authorize(toolkit, { callbackUrl })
      if (!request.redirectUrl) {
        throw new Error(`Composio returned no consent URL for ${toolkit}`)
      }
      return { connectedAccountId: request.id, redirectUrl: request.redirectUrl }
    },

    async getAccount(id) {
      return toAccount(await composio.connectedAccounts.get(id))
    },

    async deleteAccount(id) {
      await composio.connectedAccounts.delete(id)
    },

    async openSession({ tools }) {
      const session = await composio.sessions.create(OWNER_USER_ID, {
        toolkits: Object.keys(tools),
        tools: Object.fromEntries(
          Object.entries(tools).map(([toolkit, slugs]) => [
            toolkit,
            { enable: slugs },
          ])
        ),
        sessionPreset: "direct_tools",
        mcp: true,
      })
      return { url: session.mcp.url, headers: session.mcp.headers ?? {} }
    },
  }
}
