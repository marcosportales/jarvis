# 04: Failures in real use show in Jarvis Health at once

**What to build:** When a part fails while the Owner is actually using Jarvis, Health shows it as failing straight away, without waiting for the next probe, with a reason like "falló hace 2 min". A later success, from real use or a probe, puts it back to Working. The places that report:
- the Turn: Thinking when the model replies or throws, Remembering when saving the Turn fails
- the weather, Search and Browse tools: their failed outcomes and successes
- the transcription and speech routes: Understanding and Speaking

Reporting never throws and never slows a Turn.

See `../spec.md` (stories 27, 28; "Where real uses are reported").

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Health tests: a reported failure overrides an older passing probe; a later success or passing probe clears it; the reason carries when it failed
- [ ] Turn tests, with a fake Health:
  - Thinking reported working after a Reply and failing when the model throws
  - a weather or Search `failed` outcome reports that part failing
  - a Health reporter that throws doesn't fail the Turn
- [ ] The transcription and speech routes report their part on success and failure
- [ ] In the running app: with a wrong Composio key, asking for a Search turns Health Limited before the next probe would
- [ ] Typecheck, lint and the full test suite pass
