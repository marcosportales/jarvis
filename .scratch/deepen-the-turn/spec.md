# Spec: Deepen the Turn

Status: ready-for-agent

Origin: architecture-review candidate 01 (`.scratch/architecture-review/issues/01-deepen-the-turn.md`), settled in a grilling session on 2026-10-14.

## Problem Statement

Every Turn ends in the Reply route, and that route is the least-tested code in the app. Each recent feature (Sessions, Memory, Widgets, Weather, Plugins) added more hand-written wiring there:
- four ways to build a Turn's tools, each returning a different shape;
- a system prompt joined from five pieces;
- tools spread into one object, where a later tool with the same name silently replaces an earlier one;
- saving the Turn, back-filling new Memories with the Session's id, and closing the Plugin MCP session, all in a fixed order.

None of this has a test, and none can be tested without a running server and a real model, because the route reaches for global instances directly.

So any change to how Jarvis produces a Reply is a change nobody can verify:
- a Turn that fails half-way might still be saved;
- a new Memory might never be tied to its Session;
- a Plugin's tool could quietly replace one of Jarvis's own.

The developer has no good place to start the next Turn-level feature from.

## Solution

Producing a Reply moves into a Turn module with one small interface: take the Owner's text (plus the Session, the Widget layout and the Owner's coordinates) and return the Reply, having saved the Turn. The module accepts the model and the stores it depends on instead of reaching for global instances, so tests can drive whole Turns with a scripted model, in-memory SQLite and fakes for Composio, the MCP connection and HTTP.

The Reply route shrinks to parsing the request, calling the Turn module and mapping its one error to a 404.

For the Owner nothing changes, with one exception: when a Plugin offers a tool with the same name as one of Jarvis's built-in tools, the built-in tool now always wins and the Plugin's tool is left out.

## User Stories

1. As the Owner, I want every Reply to sound and behave exactly as it does today, so that this change is invisible to me.
2. As the Owner, I want a Turn whose Reply failed to leave no trace in the Session, so that my Transcript never shows half a Turn.
3. As the Owner, I want Memories that Jarvis Remembered in the first Turn of a new Session to be tied to that Session, so that they keep their origin like any other Memory.
4. As the Owner, I want a Plugin problem while Jarvis is Thinking to leave the Turn working without that Plugin, so that a broken Connector never costs me a Reply.
5. As the Owner, I want Jarvis's own abilities (Memory, Widgets, the weather) never to be replaced by a Plugin's tool of the same name, so that installing a Plugin can't break them.
6. As the Owner, I want Jarvis to tell me it couldn't finish when it runs out of tool-use steps without saying anything, so that I never get a silent Reply.
7. As the Owner, I want a Session I deleted while Jarvis was Thinking to stay deleted, so that deleting means deleting.
8. As a developer, I want one module that produces a Reply, so that I know where to look when a Reply is wrong.
9. As a developer, I want to drive a whole Turn from a test with a scripted model, so that I can verify Turn behaviour without a server or a real model.
10. As a developer, I want the Turn module to accept its model, Sessions, Memories, Plugins, Weather and clock, so that tests can substitute each one.
11. As a developer, I want tests to use real Sessions and Memories on in-memory SQLite, so that they catch bugs in how the modules are wired together, not just in each module alone.
12. As a developer, I want tests to use the real Plugins module over fake Composio and fake MCP Connector, so that Plugin notices, tools and closing are exercised as they run in production.
13. As a developer, I want the Composio and Connector fakes shared from one place, so that Plugins tests and Turn tests don't each keep their own copy.
14. As a developer, I want an unknown Session to produce one error from the Turn module, whether it was unknown from the start or deleted mid-Turn, so that callers handle a single case.
15. As a developer, I want the Reply route to only parse the request and map errors, so that HTTP concerns and Turn behaviour stay apart.
16. As a developer, I want the request body parsed by one schema into a typed request, so that the Turn module never sees unvalidated input.
17. As a developer, I want a clash between two built-in tool names to fail loudly, so that I catch it in a test rather than in a Reply.
18. As a developer, I want a Plugin tool that clashes with a built-in tool to be dropped and logged, so that the clash is visible without failing the Turn.
19. As a developer, I want the system prompt's order checked by a test, so that a reshuffle can't silently change what Jarvis reads first.
20. As a developer, I want the date line built from an injected clock, so that tests can check it exactly.
21. As a developer, I want the Plugin MCP session closed after every Turn, whether it succeeded or failed, so that connections never leak.
22. As a developer, I want the system prompt to live next to the Turn module, its only user, so that the Turn's knowledge sits in one place.

## Implementation Decisions

**A new Turn module**
- It is built with a factory that receives its dependencies: the chat model, Sessions, Memories, Plugins, Weather, and a clock. A server-side getter wires the real ones (the configured chat model, the existing getters for Sessions, Memories, Plugins and Weather, the system clock). This follows the factory-plus-getter pattern already used by Memory, Sessions, Plugins and Weather.
- Its interface is one operation, *take a Turn*:
  - Input: `{ sessionId?, text, widgets, coords? }`, where `widgets` is the Widget layout the client already sends and `coords` the Owner's coordinates when the browser already had permission.
  - Output: `{ sessionId, text, widgetChanges, memoryEvents }`, the same Reply the route returns today.
- Its one error mode is the existing unknown-Session error. It is thrown both when the given Session doesn't exist before the model is called and when it is deleted mid-Turn.

**What taking a Turn does, in order**
1. Load the Session's recent Turns. An unknown Session throws.
2. Build the Turn's tools from the four existing factories (Memory, Plugins, Widgets, Weather), unchanged.
   - If loading Plugin tools throws, fall back to no Plugin tools and no notices, and log it. This is the try/catch now in the route.
3. Merge the tools:
   - built-in tools always win over Plugin tools;
   - a Plugin tool whose name is taken is dropped and logged;
   - two built-in tools with the same name throw.
4. Build the system prompt in today's order: the static Jarvis prompt, the date line (from the injected clock), the Widget layout notice, the core-Memory notice, then the Plugin notices.
5. Call the model with the earlier Turns as user/assistant messages plus the new text, with the existing step limit.
6. Trim the Reply and replace an empty one with today's fallback sentence.
7. Save the Turn, but only now that the Reply is ready:
   - for an existing Session, add the Turn;
   - for a new one, start the Session, then back-fill the Turn's Memories with its id.
8. Close the Plugin MCP session in every case, success or failure.

**The capability factories stay as they are**
- The Memory, Widgets, Weather and Plugins tool factories keep their current interfaces and tests. The Turn module composes them explicitly.
- Giving them one shared shape is deferred to architecture-review candidate 02, which is the first change that needs it.

**The Reply route**
- Parses the body with one zod schema into the Turn module's input. Invalid input gets a 400, with the same checks as today: non-empty text, optional string Session id, a valid Widget layout, optional valid coordinates.
- Calls the Turn module through its server getter and returns its output as JSON.
- Maps the unknown-Session error to a 404. Any other error propagates as today.

**Other moves**
- The static system prompt moves next to the Turn module. The model-provider module stays where it is.
- The fake Composio and fake MCP Connector move out of the Plugins test file into a shared Plugins fixtures module, next to the Weather fixtures that already work this way.

**Unchanged on purpose**
- The client, the request and response shape on the wire, the prompt text, the step limit and the fallback sentence.
- The "Correo" rules are still always sent.

**Domain language**
- `CONTEXT.md` now says Jarvis reaches outside services only through Plugins, apart from a few abilities built into Jarvis itself such as the weather. "Built-in" in the tool collision rule means exactly those abilities plus Memory and Widgets.

## Testing Decisions

**What makes a good test here**
- Tests go only through the Turn module's interface: take a Turn, then look at the Reply and at what Sessions and Memories hold afterwards.
- They never reach into how tools are merged or how the prompt is joined, except through what the scripted model received.

**Fakes**
- Only true external systems are faked:
  - the model, with the AI SDK's mock language model from its test entry point, scripted to make tool calls and then answer;
  - Composio and the MCP Connector, with the shared fakes;
  - HTTP for Weather, with the existing fake fetch.
- Everything else is real: Sessions and Memories on in-memory SQLite, the Plugins and Weather modules, and the Memory and Widgets tool factories.

**Behaviours to cover**
1. A new Session is saved with the Turn, and Memories Remembered during it are back-filled with its id.
2. An existing Session gets the Turn added, and its earlier Turns reach the model as messages.
3. An unknown Session throws the unknown-Session error, and so does a Session deleted while the model is answering.
4. A model failure saves nothing and still closes the Plugin MCP session.
5. An empty Reply after the step limit becomes the fallback sentence.
6. The system prompt contains the date line, Widget layout notice, core Memories and Plugin notices, in that order.
7. Widget changes and Memory events made by tool calls come back in the Reply.
8. A Plugin failure while loading tools leaves no Plugin tools, and the Turn still succeeds.
9. A Plugin tool clashing with a built-in tool is dropped and the built-in one is used; two clashing built-in tools throw.

**Prior art**
- Memory tool tests: real SQLite `:memory:` with an injected clock, and real Sessions alongside.
- Plugins tests: fake Composio and fake Connector, injected into the real Plugins module.
- Weather tests: shared fake fetch from a fixtures module.
- Jarvis session tests: hand-written fakes behind ports. The repo uses no module mocking.

**Not tested here**
- The route's own zod parsing and 404 mapping stay thin and untested, like the other routes.
- The server getter only wires things together and stays untested.

## Out of Scope

- Session titling. It stays a client-triggered server action; moving it server-side belongs to candidate 03.
- A shared request/Reply schema used by both client and server (candidate 03). The route's schema is server-side only for now.
- A uniform shape for Turn capabilities, and per-capability prompt rules or Plugin Skills (candidate 02).
- The Widget module consolidation (candidate 04).
- Any change to the prompt text, model, step limit or client behaviour.

## Further Notes

- Architecture-review candidates 02 and 03 are blocked on this spec. Once it lands, run `/improve-codebase-architecture` again and re-check them before acting.
- The tool collision rule is the only change Jarvis's behaviour can show. It is unlikely to trigger, because Composio tool names are upper-case and toolkit-prefixed, unlike the built-in tool names.
