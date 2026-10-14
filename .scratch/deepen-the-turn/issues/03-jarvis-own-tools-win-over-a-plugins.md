# 03: Jarvis's own tools win over a Plugin's

**What to build:** The tool-collision rule, the spec's only behaviour change the Owner could notice. Jarvis's built-in abilities (Memory, Widgets, the weather) can never be replaced by a Plugin's tool of the same name:
- A Plugin tool whose name is already taken by a built-in tool is left out of the Turn and logged as an error, and the Turn carries on.
- Two built-in tools with the same name are a programming mistake, so taking a Turn throws.

Today, whichever tool comes later in the merge silently wins.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] When a Connected Plugin serves a tool named like a built-in tool, the model's call to that name runs the built-in tool, and the clash is logged
- [ ] The Plugin's other tools still reach the model
- [ ] Two built-in tools with the same name make taking a Turn throw
- [ ] Typecheck, lint and the full test suite pass
