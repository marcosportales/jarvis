# 03: "Sesiones" list in the sidebar

**What to build:** The sidebar gets a "Sesiones" group below the page links, on every page. It has a "Nueva sesión" button and the Sessions ordered by last activity, newest first. Each item shows its Session Title, or its date while there is none, plus a relative date ("hace 2 días"). The list loads 20 more as the Owner scrolls to the end. The current Session is highlighted. Clicking a Session opens it on the Jarvis page (closing the sidebar on mobile). "Nueva sesión" goes to `/`. A new Session appears at the top as soon as its first Turn is done, and resuming one moves it to the top.

- **Sessions store:** paging by last activity with a cursor, 20 per page.

See `.scratch/sessions/spec.md` → "Sidebar".

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The list shows Sessions newest-activity first, with a date fallback for untitled ones
- [ ] Scrolling to the end loads the next page; the last page stops cleanly
- [ ] The current Session is highlighted; clicking another opens it
- [ ] "Nueva sesión" starts an empty Session
- [ ] A Session appears and moves to the top without a reload
- [ ] Store tests: paging order, cursor, ties, last page
- [ ] Lint, typecheck and tests pass
