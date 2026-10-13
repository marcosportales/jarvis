import { google } from "./google"
import type { PluginEntry } from "./types"

/**
 * Google's Gmail MCP server (Developer Preview), read-only. Values confirmed
 * against Google's docs in `.scratch/plugins-gmail/issues/01-confirm-gmail-mcp.md`.
 */
export const gmail: PluginEntry = {
  id: "gmail",
  name: "Gmail",
  icon: "/plugins/gmail.svg",
  connector: {
    mcpUrl: "https://gmailmcp.googleapis.com/mcp/v1",
    oauth: {
      provider: google,
      scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    },
    toolAllowlist: [
      "search_threads",
      "get_thread",
      "get_message",
      "list_labels",
      "list_drafts",
    ],
  },
}
