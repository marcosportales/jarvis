# 01: Deepen the Turn: one module produces a Reply

**Strength:** Strong · **Dependencies:** local-substitutable (SQLite `:memory:`) + ports & adapters (model, Composio)

**Status:** specced → `.scratch/deepen-the-turn/spec.md`

**Blocked by:** None

**Files:** `apps/web/app/api/reply/route.ts`, `lib/memory/tools.ts`, `lib/widgets/tools.ts`, `lib/weather/tool.ts`, `lib/plugins/plugins.ts` (`toolsForTurn`), `lib/jarvis/server/nan.ts`

**Problem:** Producing a Reply is the app's central behaviour, and it lives untested in the 137-line route. The route calls the singletons (`getSessions`, `getMemories`, `getPlugins`, `getWeather`, `nan`) directly and wires four Turn capabilities, each with a different return shape:
- Memory: `{tools, events(), adoptSession()}`
- Plugins: `{tools, notices, close()}`
- Widgets: `{tools, changes()}`
- Weather: a bare `ToolSet`

Tools are spread together with no check for duplicate names, so a later spread silently wins. None of the following has a test:
- prompt assembly
- `FALLBACK_REPLY`
- saving the Turn and `adoptSession`
- `turn.close()`
- the `UnknownSessionError` race

**Solution:** Move the orchestration into a Turn module that accepts its dependencies and treats every capability through one shape: tools, a prompt contribution, and an after-Turn output. The route then only parses the request and returns the response.

**Wins:**
- Locality: Reply bugs live in one module.
- The interface is the test surface.
- Leverage: a new capability is one adapter.

**ADRs:** fits ADR-0002 (Widget changes are returned with the Reply) and ADR-0005 (Plugins stay behind Composio).

## Comments
