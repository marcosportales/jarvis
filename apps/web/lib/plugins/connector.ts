import { createMCPClient } from "@ai-sdk/mcp"
import type { ToolSet } from "ai"

/** A Connector's access token was rejected: the authorization no longer works. */
export class ConnectorAuthError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "ConnectorAuthError"
  }
}

/** An open link to one Connector for the duration of a Turn. */
export type ConnectorSession = {
  /** All tools the server exposes, ready for the AI SDK. */
  tools(): Promise<ToolSet>
  close(): Promise<void>
}

/** Opens Connectors. Throws `ConnectorAuthError` when the token is rejected. */
export type Connector = {
  connect(args: { url: string; accessToken: string }): Promise<ConnectorSession>
}

/** Bounds connecting and listing tools so a stalled server can't hang a Turn. */
const CONNECT_TIMEOUT_MS = 10_000

/** Remote MCP over Streamable HTTP with a bearer token, per ADR 0001. */
export function createMcpConnector(): Connector {
  return {
    async connect({ url, accessToken }) {
      // The MCP client may turn an HTTP 401 into a JSON-RPC error without its
      // status, so watch the responses themselves for a rejected token.
      let unauthorized = false
      const watchedFetch: typeof fetch = async (input, init) => {
        const response = await fetch(input, init)
        if (response.status === 401) unauthorized = true
        return response
      }
      async function translateAuthErrors<T>(run: () => Promise<T>) {
        try {
          return await run()
        } catch (error) {
          if (!unauthorized) throw error
          throw new ConnectorAuthError("Connector rejected the access token", {
            cause: error,
          })
        }
      }

      const client = await translateAuthErrors(() =>
        createMCPClient({
          transport: {
            type: "http",
            url,
            headers: { Authorization: `Bearer ${accessToken}` },
            fetch: watchedFetch,
          },
          clientName: "jarvis",
          initializationOptions: { timeout: CONNECT_TIMEOUT_MS },
        })
      )
      return {
        async tools() {
          const definitions = await translateAuthErrors(() =>
            client.listTools({ options: { timeout: CONNECT_TIMEOUT_MS } })
          )
          const tools = client.toolsFromDefinitions(definitions)
          // Tool calls also surface a rejected token as ConnectorAuthError.
          return Object.fromEntries(
            Object.entries(tools).map(([name, mcpTool]) => [
              name,
              {
                ...mcpTool,
                execute: (...args: Parameters<typeof mcpTool.execute>) =>
                  translateAuthErrors(async () => mcpTool.execute(...args)),
              },
            ])
          ) as ToolSet
        },
        close: () => client.close(),
      }
    },
  }
}
