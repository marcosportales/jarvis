# 06: Switching Sessions mid-Turn

**What to build:** If the Owner opens another Session (or "Nueva sesión") while Jarvis is Thinking or Speaking, the voice stops at once and the new Session opens Idle. A Reply that was still on its way is saved in its original Session by the server, but never shown or spoken in the new one. Resuming the original Session later shows that Turn. The client Session gets a teardown that stops the Voice and makes late callbacks no-ops (the existing generation guard).

See `.scratch/sessions/spec.md` → "Switching mid-Turn".

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Switching while Speaking stops the voice immediately
- [ ] Switching while Thinking: the late Reply doesn't appear or play in the new Session, and is in the original Session when resumed
- [ ] Session tests: teardown while Speaking stops the Voice; a late Reply after teardown changes nothing
- [ ] Lint, typecheck and tests pass
