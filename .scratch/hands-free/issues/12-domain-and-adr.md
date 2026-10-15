# 12: Domain: Utterance, Listening, Push-to-talk and a waiting Jarvis State

Type: grilling
Status: open
Blocked by: 07, 08, 09, 10

## Question

Rewrite the Voice vocabulary in `CONTEXT.md` for hands-free conversation:
- **Utterance:** no longer "captured while push-to-talk is held". What bounds it now?
- **Listening:** does it mean speech is being heard, or that the mic is open at all?
- **Push-to-talk:** is it removed, kept as a fallback, or renamed?
- Is a new Jarvis State needed for "the mic is open and Jarvis is waiting quietly" (e.g. Waiting), and how does it differ from Idle (mic closed)? Do Speaking ("starting push-to-talk cuts it short") and Thinking need new wording?
- Do the definitions of the Orb, the Floating Orb and the Jarvis App change?

Then write the ADR that records replacing Push-to-talk with hands-free conversation. Push-to-talk was decided in `.scratch/voice-mvp/spec.md` and its global key in ADR 0009, so the new ADR supersedes those parts.
