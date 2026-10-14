# 01: Jarvis takes a Turn through one module

**What to build:** Producing a Reply moves out of the Reply route into a new Turn module (see `../spec.md`, "Implementation Decisions"). The Owner notices nothing: every Reply sounds and behaves exactly as before.
- **The Turn module** is built from a factory that receives the chat model, Sessions, Memories, Plugins, Weather and a clock. A server getter wires the real ones.
- **Its one operation** takes `{ sessionId?, text, widgets, coords? }` and returns `{ sessionId, text, widgetChanges, memoryEvents }`.
- **What it does, in today's order:**
  - load the earlier Turns;
  - compose the four existing tool factories, unchanged, keeping today's fallback to no Plugin tools when loading them throws;
  - build the system prompt;
  - call the model with the step limit;
  - apply the fallback sentence;
  - save the Turn only once the Reply is ready, back-filling Memories when it starts a new Session;
  - close the Plugin MCP session in every case.
- **Unknown Sessions:** the module throws the unknown-Session error, both when the Session never existed and when it is deleted mid-Turn.
- **The route** only parses the body with one zod schema (same 400 checks as today), calls the Turn module, returns its output, and maps the unknown-Session error to a 404.
- **The static system prompt** moves next to the Turn module. The model-provider module stays where it is.
- **Tool merging** keeps today's behaviour in this ticket. The collision rule is ticket 03.

Tests go only through the Turn module's operation:
- the AI SDK's mock language model (from its test entry point, matching the model version the provider returns), scripted to make tool calls and then answer;
- real Sessions and Memories on in-memory SQLite with an injected clock;
- the real Plugins module with no Composio (not configured);
- the real Weather module over the existing fake fetch.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A Turn without a Session starts a new one, saves the Turn in it, and back-fills Memories Remembered during it with the new Session's id
- [ ] A Turn on an existing Session adds the Turn, and the earlier Turns reach the model as user/assistant messages before the new text
- [ ] An unknown Session throws the unknown-Session error, and so does a Session deleted while the model is answering. Neither saves anything.
- [ ] An empty Reply after the step limit becomes the fallback sentence, and that sentence is what gets saved
- [ ] The system prompt holds, in order: the static Jarvis prompt, the date line from the injected clock, the Widget layout notice, then the core-Memory notice
- [ ] Widget changes and Memory events made by the model's tool calls come back in the Reply
- [ ] The Reply route keeps the same request and response on the wire, returns 400s for the same invalid inputs, and returns a 404 for an unknown Session
- [ ] Jarvis answers a real question in the running app as before (manual check)
- [ ] Typecheck, lint and the full test suite pass
