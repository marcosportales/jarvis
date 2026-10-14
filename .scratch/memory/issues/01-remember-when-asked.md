# 01: Jarvis Remembers when asked, across Sessions

**What to build:** The Owner says "recuerda que mi hermana se llama Lucía". Jarvis keeps it, and a "Recordado: …" line appears under the Reply. In any other Session, "¿cómo se llama mi hermana?" is answered from Memory. Saying the same kind of fact again with a new value replaces the old Memory instead of adding a second one. This is the tracer bullet through every layer:

- **Memory store:** a memories table (topic key unique, title, content, source Session nullable and set null on Session delete, timestamps) plus an FTS5 index, in the shared database (ADR 0004).
- **Jarvis's Memory tools for a Turn** (new seam, mirroring the Widget tools): `remember(topicKey, title, content)` replaces by topic key, otherwise inserts, and records a "remembered" event. A core notice puts Memories (with their topic keys) into the system prompt, newest-updated first, cut at roughly 1,500 tokens.
- **Reply contract:** the response adds the Turn's Memory events. They are saved with the Turn and shown as a subtle line under the Reply, also when resumed. They are never spoken or sent back to the model.
- Spanish prompt rules: Remember when the Owner asks, write Memories in third person in one or two sentences, and reuse the topic key when a fact changes.

See `.scratch/memory/spec.md`.

**Blocked by:** Sessions 02 (`.scratch/sessions/issues/02-sessions-are-saved.md`)

**Status:** done

- [x] "Recuerda que…" shows "Recordado: …" and the fact is used in a new Session
- [x] A changed fact replaces the old Memory
- [x] The marker still shows after resuming the Session
- [x] Deleting the source Session keeps the Memory
- [x] Tool tests: insert, replace by topic key, event recorded; core notice order and budget cut
- [x] Sessions store test: Memory events come back with the Transcript
- [x] Session test: Memory events land on the Reply's entry and aren't sent back as lines
- [x] Lint, typecheck and tests pass

## Comments

Checked by hand against the real model (throwaway database): "Recuerda que mi hermana se llama Lucía" → "Recordado: Su hermana"; a new Session answered "Lucía, señor."; Acme → Globex replaced the single `trabajo` Memory; the marker renders on the resumed Session page.
