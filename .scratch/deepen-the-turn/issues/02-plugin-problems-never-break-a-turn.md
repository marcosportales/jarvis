# 02: Plugin problems never break a Turn, verified

**What to build:** Turn tests cover the Plugins side of a Turn, so the Owner's guarantee holds under test: a broken Connector never costs a Reply, and a connection is never left open.
- The fake Composio and fake MCP Connector move out of the Plugins test file into a shared Plugins fixtures module, the way Weather's fake fetch already lives in a fixtures module.
- The Plugins tests import the fakes from there, unchanged in behaviour.
- Turn tests then build the real Plugins module over those fakes, with Gmail Connected or failing as each case needs.

No production behaviour changes in this ticket. If a test exposes a gap, fix the Turn module to match the spec.

**Blocked by:** 01

**Status:** done

- [x] The fake Composio and fake Connector live in one shared fixtures module, and the Plugins tests use them from there and still pass
- [x] A model failure mid-Turn saves nothing and still closes the Plugin MCP session
- [x] A successful Turn closes the Plugin MCP session too
- [x] When loading Plugin tools fails, the Turn succeeds with no Plugin tools and no Plugin notices
- [x] A Connected Plugin's tools reach the model, and Plugin notices (e.g. Reconnect) land last in the system prompt, after the core-Memory notice
- [x] Typecheck, lint and the full test suite pass
