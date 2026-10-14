# 04: Jarvis titles each Session

**What to build:** After a Session's first Turn is saved, Jarvis gives it a short Spanish Session Title (3 to 5 words), and the list shows it in place of the date. Generating it never delays the Reply: it is a separate call made after the Reply is returned. Generation is an injected function, so store and route tests never call the model. If it fails, the title stays empty and the list keeps showing the date.

See `.scratch/sessions/spec.md` → "Session Title".

**Blocked by:** 03

**Status:** done

- [x] A new Session shows a sensible Spanish title in the list shortly after its first Turn
- [x] The first Reply is not slower than before
- [x] A failed title generation leaves the date showing and doesn't fail the Turn
- [x] Store test: setting a title is reflected in the list
- [x] Lint, typecheck and tests pass
