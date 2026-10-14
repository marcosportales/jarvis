# 03: Jarvis Forgets on request

**What to build:** "Olvida lo de mi trabajo" makes Jarvis delete the matching Memory, confirm in one short sentence, and show "Olvidado: …" under the Reply. If nothing matches, Jarvis says it didn't have that saved and shows no marker. `forget(topicKey)` deletes and records a "forgotten" event; an unknown key returns a model-facing no-match. The Owner correcting a misheard Memory ("no, Lucía, no Lucas") works by replacing it through its topic key.

See `.scratch/memory/spec.md` → "Forgetting".

**Blocked by:** 01

**Status:** done

- [x] "Olvida…" deletes the Memory and shows "Olvidado: …"
- [x] Forgetting something never said gets a "no lo tenía guardado" style Reply and no marker
- [x] A misheard Memory can be corrected by voice
- [x] Tool tests: forget removes and records an event; an unknown key gives no-match and no event
- [x] Lint, typecheck and tests pass

## Comments

Checked by hand: "Olvida lo de mi trabajo" → "Hecho, ya lo he olvidado." + "Olvidado: Su trabajo"; "Olvida lo de mi coche" → "No tenía nada guardado sobre tu coche…", no marker; "No, se llama Lucas no, se llama Toby" replaced the `perro` Memory in place.
