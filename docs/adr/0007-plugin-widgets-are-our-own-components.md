---
status: accepted
---

# Plugin Widgets are our own components, not MCP Apps

A Plugin's Widget is a component in this repo, like a built-in Widget. It is fed by our own server-side tools that call the Plugin's Composio toolkit, and it exists only while that Plugin is Connected. The Calendar Widget of the Google Calendar Plugin is the first. This supersedes ADR 0003, which expected Plugin Widgets to be MCP Apps served by the Plugin's MCP server in a sandboxed iframe. Since ADR 0005, every Connector goes through Composio, which serves no MCP Apps UI for its toolkits, so ADR 0003 would mean no Plugin Widgets at all. Every Marketplace entry is ours, so the reason behind ADR 0003, keeping third-party code away from the Owner's tokens, still holds: no third-party code runs in the page.

## Consequences

- Adding a Plugin that brings a Widget means writing code (a component and the tools that feed it), not only a catalog entry.
- The Widget registry knows which Plugin brings each Widget, and hides it from the Owner and from Jarvis's tools while that Plugin isn't Connected.
