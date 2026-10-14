---
status: superseded by ADR-0007
---

# Plugin Widgets will be MCP Apps in sandboxed iframes

When Plugins start bringing Widgets, those Widgets will be UI served by the Plugin's MCP server (MCP Apps) and rendered in a sandboxed iframe, never third-party code imported into the app. This extends ADR 0001: third-party code must not run with access to the Owner's tokens, and adding a Plugin should stay a catalog entry rather than new code. Built-in Widgets (e.g. Weather) are ordinary components in this repo.

## Consequences

- The Widget registry distinguishes built-in Widgets from Plugin Widgets, but only built-in ones exist for now.
- A Plugin whose MCP server ships no UI cannot bring a Widget.
