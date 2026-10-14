---
status: accepted
---

# Search is built-in tools over Composio, not a Plugin

Search and Browse use Composio's `composio_search` and `browser_tool` toolkits. These need no authorization from the Owner (`NO_AUTH`), so there is nothing to install or connect, and they are built into Jarvis like the weather instead of being Plugins. Jarvis does not pass Composio's tools straight to the model over MCP the way Plugins do. Our own tools call `composio.tools.execute(...)` and turn each response into a small Result shape (title, details, link). The model sees only that shape, and the same shape fills the Results Widget. Raw toolkit output is too large for the model to read on every step (a single flights response runs to tens of KB) and too unstable for a Widget to render. We also considered running our own Playwright and paying for Tavily, Exa or SerpAPI keys directly. Composio already offers flights, hotels, places, news and the web behind the key we have, and a hosted browser with a live view.

## Consequences

- Every kind of search we add needs a small mapper from Composio's response to the Result shape, so adding one means writing code, not only adding a catalog entry.
- Composio sits under Search and Browse as well as Plugins, so its quotas and outages affect these too. A failing Search must never break a Turn, the same rule as for Plugins.
- Switching to another provider later means rewriting the mappers, but not the tools the model sees or the Widget.
