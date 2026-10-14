# Memories live in Jarvis's own SQLite database, not in Engram

Memories are rows in a table in the existing `jarvis.db`, searched with SQLite FTS5. They borrow Engram's shape: a short title, content, and a topic key so an evolving fact is updated rather than duplicated. We considered running Engram (a Go binary reached over stdio MCP), a separate memory database, and a MEMORY.md file. Engram would mean shipping and supervising a second process, and it brings concepts made for coding agents (projects, working directories, file paths) that mean nothing to a voice butler. It would also be the first local stdio MCP server, against ADR 0001. A separate database buys no isolation for a single Owner. A MEMORY.md tends to end up fully in the prompt on every Turn.

## Consequences

- Search is keyword-based (FTS5), with no embeddings. A Spanish synonym the Owner didn't use won't match until we revisit this.
- Memory size in the prompt is bounded by design: a capped core is always included and the rest is reached through a recall tool.
