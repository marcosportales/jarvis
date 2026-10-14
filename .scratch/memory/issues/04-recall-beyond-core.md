# 04: Recall beyond the core, and "¿qué sabes de mí?"

**What to build:** Once Memories exceed the core budget, Jarvis still finds older ones: the core notice says more Memories exist, and `recall(query)` searches them with FTS5 (ranked, limited, accent-insensitive for Spanish) and returns them with their topic keys, so Jarvis can also update or Forget them. "¿Qué sabes de mí?" gets a one-to-three-sentence summary with an offer of more, never a full recital.

See `.scratch/memory/spec.md` → "Recalling".

**Blocked by:** 01

**Status:** done

- [x] With more Memories than the budget, a question about an old one is answered via `recall`
- [x] "¿Qué sabes de mí?" gives a short summary and offers more
- [x] Tool tests: recall finds by FTS, including accented words; ranking and limit; the core notice mentions `recall` only when cut
- [x] Lint, typecheck and tests pass

## Comments

Checked by hand with 44 Memories (the 43 newest take ~6,600 characters, over the ~6,000-character budget): "¿Cómo se llama mi médico?" found the oldest, cut Memory via `recall`; "¿Qué sabes de mí?" gave a two-sentence summary and offered more.
