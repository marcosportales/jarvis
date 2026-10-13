# 03: Marketplace page lists the Gmail Plugin

**What to build:** The Owner opens `/plugins` and sees the Marketplace with one Plugin, Gmail, showing its state: "not configured" when its OAuth credentials are missing from env, otherwise installable. This is the tracer bullet that stands up the groundwork every later ticket builds on:

- The **Plugins module** (server-only), the single test seam for this feature. Its public interface will grow to: list the Marketplace with each Plugin's state, begin install, complete install, uninstall, and tools for a Turn. This ticket delivers only *list*.
- The **catalog**: a fixed, in-code list with one entry per Plugin (id, name, icon, Connector MCP URL, OAuth provider, scopes, read-only tool allowlist). Gmail is the only entry; use placeholders where ticket 01 hasn't confirmed values yet, clearly marked.
- **Persistence**: local SQLite via Drizzle in a gitignored file, with a schema for Installed Plugins and their OAuth tokens. Storage is injected into the Plugins module so tests can use an in-memory store.
- The `/plugins` page rendering the list. Read the bundled Next docs before writing the page (see AGENTS.md).

Use the vocabulary from CONTEXT.md (Marketplace, Plugin, Connector, Installed, Connected).

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `/plugins` lists Gmail with name and icon
- [x] Gmail shows "not configured" when Google OAuth credentials are absent from env, and installable when present
- [x] SQLite database file is created locally and gitignored; schema covers Installed Plugins and tokens
- [x] Plugins module tests (Vitest, following the fake-adapter style of the Jarvis Session controller tests) cover the list states using an in-memory store and fake env
- [x] Lint, typecheck and tests pass
