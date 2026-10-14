# 02: Jarvis Remembers on its own, within the bar

**What to build:** Jarvis Remembers lasting facts the Owner mentions without being asked (preferences, people, places, routines, standing instructions), says so in a few words ("Lo tendré en cuenta"), and shows the "Recordado" marker. It does not Remember things a Plugin can look up, things only true for now ("mañana tengo dentista"), or secrets (passwords, PINs, card numbers, codes). For secrets it says in one sentence that it won't keep them. This is mostly Spanish system-prompt rules on top of ticket 01's tools.

See `.scratch/memory/spec.md` → user stories 3–7.

**Blocked by:** 01

**Status:** done

- [x] "Prefiero que me hables de tú" in passing gets a brief acknowledgement and a marker
- [x] "Mañana tengo dentista a las 10" is not Remembered
- [x] "Mi PIN es 1234" is not Remembered, and Jarvis says so
- [x] Asking about emails or weather never produces a Memory
- [x] Checked by hand against the real model (judgment isn't unit-tested)
- [x] Lint, typecheck and tests pass

## Comments

Checked by hand against the real model: "prefiero que me hables de tú" in passing → "Lo tendré en cuenta" + marker; dentist and bank meeting not Remembered; "Mi PIN es 1234" → "Por seguridad, los PIN no los guardo"; weather and email questions produced no Memory. Added a rule against promising to keep ephemeral facts in mind or offering reminders, after the model offered "¿Quieres que te lo recuerde?".
