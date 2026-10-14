---
status: accepted
---

# Connectors go through Composio

Every Connector is reached through Composio (composio.dev): Composio holds the Owner's authorizations with each service and exposes the allowlisted tools as a per-Owner remote MCP server, authenticated with a Composio API key from env. This supersedes ADR 0001. Going direct (our own OAuth client against each service's own MCP server) stalled on Gmail, whose MCP server only works for Cloud projects enrolled in Google's Workspace Developer Preview, which the Owner could not join; and it would repeat that per-service setup for every future Plugin. We compared Composio, Arcade and Pipedream Connect: Arcade's built-in Google app is meant only for getting started (production needs our own Google app again), and Pipedream's Connect pricing is unclear after Workday's acquisition. Composio's own Google app is verified and meant for real use, and its free tier covers one Owner.

## Consequences

- A third party now holds the Owner's tokens and runs the tool calls, which ADR 0001 was written to avoid. Jarvis keeps only the Composio API key.
- Composio's Google app asks for broader Gmail permissions than read-only; the per-Plugin tool allowlist is what keeps Jarvis read-only.
- Composio connects to the services' REST APIs, not their own MCP servers, so what Jarvis can do is bounded by Composio's toolkits.
- Connectors stay remote MCP, so ADR 0003 (Plugin Widgets as MCP Apps) still holds in principle, but depends on Composio serving MCP Apps UI.
