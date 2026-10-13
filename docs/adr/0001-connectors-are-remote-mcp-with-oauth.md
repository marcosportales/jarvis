# Connectors are remote MCP servers authorized with OAuth

Every Connector is a remote (HTTP) MCP server that the Owner authorizes through OAuth, using an OAuth client whose credentials live in env. We chose this over hand-writing tools against each service's API (e.g. calling the Gmail API directly) and over running local stdio MCP servers, so that adding a Plugin to the Marketplace is one catalog entry plus credentials — not new integration code — and so that third-party code never runs on the Owner's machine holding their tokens.

## Consequences

- A service without a remote MCP server can't become a Plugin until it ships one (or we revisit this ADR).
- What Jarvis can do with a service is bounded by the tools its MCP server exposes — e.g. Google's Gmail MCP (Developer Preview at time of writing) can read and draft but not send.
