# 03: Jarvis Forgets on request

**What to build:** "Olvida lo de mi trabajo" makes Jarvis delete the matching Memory, confirm in one short sentence, and show "Olvidado: …" under the Reply. If nothing matches, Jarvis says it didn't have that saved and shows no marker. `forget(topicKey)` deletes and records a "forgotten" event; an unknown key returns a model-facing no-match. The Owner correcting a misheard Memory ("no, Lucía, no Lucas") works by replacing it through its topic key.

See `.scratch/memory/spec.md` → "Forgetting".

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] "Olvida…" deletes the Memory and shows "Olvidado: …"
- [ ] Forgetting something never said gets a "no lo tenía guardado" style Reply and no marker
- [ ] A misheard Memory can be corrected by voice
- [ ] Tool tests: forget removes and records an event; an unknown key gives no-match and no event
- [ ] Lint, typecheck and tests pass
