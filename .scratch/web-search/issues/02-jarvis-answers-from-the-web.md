# 02: Jarvis answers from the web

**What to build:** The Owner asks something current ("¿qué ha pasado hoy con…?", "¿qué dice la web del Prado sobre los horarios?") and Jarvis searches the web, reads a page if it needs to, and answers out loud in the same Reply. There's no Widget yet.
- A new Search module over the search port from ticket 01, with the web and page mappers into the shared Search Outcome (kind, heading, results with title, subtitle, facts, url and source, plus an optional answer).
- Jarvis's built-in `search_web` and `read_page` tools render the Search Outcome as compact Spanish lines for the model, never raw JSON. A failed or empty Search becomes a line for the model, never a thrown error.
- The Turn adds these tools to the built-in ones and returns the latest Search Outcome of the Turn on the Reply as an optional `search` field. The client Reply contract accepts and validates the new field.
- The system prompt gets the Search section: search when the answer depends on current or outside facts, never invent, never say URLs, name a source only when it matters, and when Search fails say so and answer from general knowledge marked as possibly out of date.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Mapper tests over the ticket 01 fixtures for web and page
- [ ] A Turn test where the model calls `search_web`: the fake port gets the right slug and inputs, and the Reply carries the `search` outcome
- [ ] A Turn test where the search port throws: the Turn still replies and the model saw the failure line
- [ ] A Turn with no Search returns no `search`
- [ ] A Plugin tool with a Search tool's name is left out (existing merge rule)
- [ ] Asking Jarvis a current question in the running app gets a correct spoken answer
- [ ] Typecheck, lint and the full test suite pass
