import { createMCPClient, MCPClientError } from "@ai-sdk/mcp"
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

function isAuthFailure(error: unknown) {
  return (
    MCPClientError.isInstance(error) &&
    (error.statusCode === 401 || error.statusCode === 403)
  )
}

/** Wraps a call so HTTP 401/403 from the server becomes `ConnectorAuthError`. */
async function translateAuthErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (isAuthFailure(error)) {
      throw new ConnectorAuthError("Connector rejected the access token", {
        cause: error,
      })
    }
    throw error
  }
}

/** Remote MCP over Streamable HTTP with a bearer token, per ADR 0001. */
export function createMcpConnector(): Connector {
  return {
    async connect({ url, accessToken }) {
      const client = await translateAuthErrors(() =>
        createMCPClient({
          transport: {
            type: "http",
            url,
            headers: { Authorization: `Bearer ${accessToken}` },
          },
          clientName: "jarvis",
        })
      )
      return {
        async tools() {
          const tools = await translateAuthErrors(() => client.tools())
          // Tool calls also surface auth failures as ConnectorAuthError.
          return Object.fromEntries(
            Object.entries(tools).map(([name, t]) => [
              name,
              {
                ...t,
                execute: (input: unknown, options: never) =>
                  translateAuthErrors(async () => t.execute(input, options)),
              },
            ])
          ) as ToolSet
        },
        close: () => client.close(),
      }
    },
  }
}
