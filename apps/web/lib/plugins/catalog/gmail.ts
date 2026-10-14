import type { PluginEntry } from "./types"

/**
 * Gmail through Composio's managed Google app, read-only by allowlist. Slugs
 * confirmed in `.scratch/plugins-composio/issues/01-confirm-composio-api.md`.
 */
export const gmail: PluginEntry = {
  id: "gmail",
  name: "Gmail",
  icon: "/plugins/gmail.svg",
  toolkit: "gmail",
  toolAllowlist: [
    "GMAIL_FETCH_EMAILS",
    "GMAIL_FETCH_MESSAGE_BY_THREAD_ID",
    "GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID",
    "GMAIL_LIST_LABELS",
    "GMAIL_LIST_DRAFTS",
  ],
}
