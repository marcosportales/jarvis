import { createMCPClient } from "@ai-sdk/mcp"
import type { ToolSet } from "ai"

/** An open link to one Connector for the duration of a Turn. */
export type ConnectorSession = {
  /** All tools the server exposes, ready for the AI SDK. */
  tools(): Promise<ToolSet>
  close(): Promise<void>
}

/** Opens Connectors: remote MCP servers reached with the given headers. */
export type Connector = {
  connect(args: {
    url: string
    headers: Record<string, string>
  }): Promise<ConnectorSession>
}

/** Bounds connecting and listing tools so a stalled server can't hang a Turn. */
const CONNECT_TIMEOUT_MS = 10_000

/** Remote MCP over Streamable HTTP, e.g. a Composio session (ADR 0005). */
export function createMcpConnector(): Connector {
  return {
    async connect({ url, headers }) {
      const client = await createMCPClient({
        transport: { type: "http", url, headers },
        clientName: "jarvis",
        initializationOptions: { timeout: CONNECT_TIMEOUT_MS },
      })
      return {
        async tools() {
          const definitions = await client.listTools({
            options: { timeout: CONNECT_TIMEOUT_MS },
          })
          return client.toolsFromDefinitions(definitions) as ToolSet
        },
        close: () => client.close(),
      }
    },
  }
}
