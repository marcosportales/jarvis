# Spec: Memory — Jarvis remembers what matters about the Owner

Status: ready-for-agent

## Problem Statement

Every Session starts from zero. The Owner has to repeat who people are, what they prefer and how they want things done, and nothing they tell Jarvis survives beyond the conversation. Keeping a big file of notes and sending it all every Turn would grow without limit and slow down a voice assistant, so Jarvis needs to keep only what is worth keeping and bring it up efficiently.

## Solution

Jarvis keeps Memories: durable facts about the Owner (preferences, people, places, routines, standing instructions) that apply across all Sessions. It Remembers when the Owner asks ("recuerda que…"), and also on its own when something clearly passes the bar, in which case it says so in a few words. It Forgets on request. A small marker under the Reply in the Transcript shows every Remember and Forget, so a misheard Memory gets noticed at once. Memories never include secrets, things a Plugin can look up, or things only true for now. Memories go into Jarvis's prompt up to a fixed budget, newest-updated first. Anything beyond the budget is reachable through a search tool. Memories live in Jarvis's own database (ADR 0004).

## User Stories

### Remembering

1. As the Owner, I want to say "recuerda que mi hermana se llama Lucía" and have Jarvis keep it, so that I never have to repeat it.
2. As the Owner, I want Jarvis to use what it remembers in any Session, so that a new conversation still knows me.
3. As the Owner, I want Jarvis to Remember on its own when I mention a lasting preference, person, place, routine or standing instruction, so that I don't have to say "recuerda".
4. As the Owner, I want Jarvis to say briefly when it Remembers something on its own ("Lo tendré en cuenta"), so that nothing is kept behind my back.
5. As the Owner, I want Jarvis not to Remember things it can look up (emails, weather, calendar), so that its Memory isn't filled with stale copies.
6. As the Owner, I want Jarvis not to Remember things only true for now ("mañana tengo dentista"), so that Memory stays durable.
7. As the Owner, I want Jarvis never to keep passwords, PINs, card numbers or codes, and to tell me so in one sentence, so that my secrets aren't stored.
8. As the Owner, I want a changed fact ("ya no trabajo en Acme, ahora estoy en Globex") to replace the old Memory, so that Jarvis never holds two contradictory facts.
9. As the Owner, I want to correct a misheard Memory just by saying so ("no, Lucía"), so that mistakes are cheap to fix.

### Seeing what happened

10. As the Owner, I want a small "Recordado: …" line under the Reply whenever Jarvis Remembers, so that I can check what it kept.
11. As the Owner, I want a small "Olvidado: …" line under the Reply whenever Jarvis Forgets, so that I can check what it removed.
12. As the Owner, I want those markers to still show when I resume the Session, so that the Transcript stays accurate.

### Forgetting

13. As the Owner, I want to say "olvida que…" and have Jarvis delete that Memory, so that I control what it knows.
14. As the Owner, I want Jarvis to confirm in one short sentence when it Forgets, so that I know it worked.
15. As the Owner, I want Jarvis to say so when nothing matches what I asked it to Forget, so that it never pretends.
16. As the Owner, I want deleting a Session to keep the Memories learned in it, so that cleaning up conversations doesn't make Jarvis forget me.

### Recalling

17. As the Owner, I want Jarvis to answer from its Memories without a noticeable delay, so that voice stays snappy.
18. As the Owner, I want Jarvis to still find older Memories once there are too many to always include, so that nothing is lost as Memory grows.
19. As the Owner, I want to ask "¿qué sabes de mí?" and get a one-to-three-sentence summary with an offer of more, so that I can check what Jarvis knows without a long recital.

## Implementation Decisions

### Domain

- `CONTEXT.md` defines **Memory** and **Remember / Forget**. ADR 0004 records why Memories live in Jarvis's database (FTS5) and not in Engram, a separate database or a MEMORY.md file.

### Memory store (new, server)

- A memories table in the shared database: id, topic key (unique), title, content (Spanish, third person, one or two sentences, e.g. "El dueño prefiere que no le lea los correos de LinkedIn."), source Session id (nullable, set null when that Session is deleted), created at, updated at. An FTS5 table over title and content is kept in sync.
- Operations:
  - remember (replace by topic key, otherwise insert)
  - forget (by topic key)
  - search (FTS, ranked, limited)
  - the core list (newest-updated first, cut at a token budget of roughly 1,500 tokens, estimated from character count)
  - list all

### Jarvis's Memory tools for a Turn (server)

- These mirror the Widget tools: a factory returns the tools plus the Memory events recorded during the Turn, and a notice builds the core Memories for the system prompt.
- Tools:
  - `remember(topicKey, title, content)` saves and records a "Recordado" event.
  - `forget(topicKey)` deletes and records an "Olvidado" event. An unknown key returns a model-facing "no match" and records nothing.
  - `recall(query)` returns matching Memories with their topic keys.
- The core notice lists each Memory with its topic key so Jarvis can reuse the key when updating. When the core is cut by the budget, the notice says more Memories exist and can be found with `recall`.
- Tool failures never fail the Turn.
- New Spanish system-prompt rules:
  - what is worth remembering, and what never is (secrets, lookups, ephemeral facts)
  - announce an unasked Remember in a few words
  - confirm a Forget in one sentence, and say so when nothing matched
  - reuse the topic key to replace a changed fact
  - answer "¿qué sabes de mí?" in one to three sentences and offer more

### Reply contract and Transcript

- The Reply response adds the Memory events for the Turn (`{ kind: "remembered" | "forgotten", title }`). They are saved with the Turn, so a resumed Session shows them.
- The client shows each event as a subtle line under that Turn's Reply: "Recordado: …" or "Olvidado: …". Memory events are not spoken, and they're not sent back to the model as Transcript.

## Testing Decisions

- Good tests use only public interfaces and assert what Jarvis or the Owner would notice: what is kept, what replaced what, what search finds, what goes into the prompt, and which events a Turn produced.
- **Memory tools + core notice** (new seam, like the Widget tools): call the tools' `execute` directly against an in-memory SQLite database with migrations applied. Cover:
  - remember inserts, and the same topic key replaces
  - forget removes, and an unknown key gives a model-facing no-match with no event
  - recall finds by FTS (including accented Spanish words)
  - the core notice orders newest-updated first, cuts at the budget and mentions `recall` when cut
  - deleting the source Session keeps the Memory
  - events are recorded only for successful calls
- **Sessions store** (existing seam from the Sessions spec): Memory events saved with a Turn come back with the Transcript.
- **Jarvis Session** (existing seam): Memory events from the Brain appear on the Reply's Transcript entry and are never sent back as lines.
- The model's judgment (what it Remembers, refusing secrets, the "¿qué sabes de mí?" summary) is checked by hand, like the existing weather and email rules.
- Prior art: the Widget tools tests, and the Plugins tests' in-memory database.

## Acceptance criteria

- "Recuerda que mi hermana se llama Lucía" shows "Recordado: …". In a new Session, "¿cómo se llama mi hermana?" gets "Lucía".
- Mentioning "prefiero que me hables de tú" unprompted gets a brief acknowledgement and a "Recordado" marker.
- "Mi PIN es 1234" is not kept, and Jarvis says so.
- "Ya no trabajo en Acme, ahora estoy en Globex" replaces the work Memory instead of adding a second one.
- "Olvida lo de mi trabajo" shows "Olvidado: …". Asking to forget something never said gets a "no lo tenía guardado" style Reply.
- Deleting the Session where a Memory was learned keeps the Memory.

## Out of Scope

- A Memories page to list, edit or delete Memories (a later slice; the source Session link is stored for it).
- Embeddings or semantic search (see ADR 0004).
- Memories brought by Plugins, or shared between Owners.
- Summarizing Sessions into Memories automatically at the end of a Session.
- Expiring Memories or reminders.

## Further Notes

- Blocked on the Sessions spec: Memory events are saved with Turns, and Memories point at their source Session.
- If Memory grows past the core budget often, consider a "pinned" flag later instead of pure recency.
