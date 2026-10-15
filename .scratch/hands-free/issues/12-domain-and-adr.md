# 12: Domain: Utterance, Listening, Push-to-talk and a waiting Jarvis State

Type: grilling
Status: resolved
Blocked by: 07, 08, 09, 10

## Question

Rewrite the Voice vocabulary in `CONTEXT.md` for hands-free conversation:
- **Utterance:** no longer "captured while push-to-talk is held". What bounds it now?
- **Listening:** does it mean speech is being heard, or that the mic is open at all?
- **Push-to-talk:** is it removed, kept as a fallback, or renamed?
- Is a new Jarvis State needed for "the mic is open and Jarvis is waiting quietly" (e.g. Waiting), and how does it differ from Idle (mic closed)? Do Speaking ("starting push-to-talk cuts it short") and Thinking need new wording?
- **Interrupted Reply** (from **Interrupting: does speaking over Jarvis cut it short?**): a Reply the Owner didn't fully hear, cut short or never spoken. Add it, and reword Speaking (voice, a tap or a hold cuts it short) and Thinking (speech during it queues as the next Turn).
- Do the definitions of the Orb, the Floating Orb and the Jarvis App change?

Then write the ADR that records replacing Push-to-talk with hands-free conversation. Push-to-talk was decided in `.scratch/voice-mvp/spec.md` and its global key in ADR 0009, so the new ADR supersedes those parts.

## Answer

**"The mic is open" is not a Jarvis State.** It is a separate on/off called **Hands-free**, kept apart from Jarvis State the way Jarvis Health is. The four States stay: Idle, Listening, Thinking, Speaking. All of it is now in `CONTEXT.md`.

- **Hands-free** (new): the way the Owner talks to Jarvis without holding anything. While it's on, the mic stays open and every stretch of speech Jarvis hears becomes an Utterance. It is always off when Jarvis starts. Turning it off is the mute; there's no separate term for "mic open".
- **Utterance**: everything the Owner says that becomes one Turn, from when Jarvis hears it start until the end-of-turn pause, or from pressing Push-to-talk to releasing it. The pieces sent to Whisper are a build detail, not Utterances. A Turn is still one Utterance or one typed message.
- **Push-to-talk**: same name, narrower meaning. It is the hold that speaks a single Utterance, whether Hands-free is on or off. A tap is no longer Push-to-talk; it toggles Hands-free.
- **Listening**: an Utterance is being captured, from voice detection or a hold. It does not mean the mic is open.
- **Idle**: none of the others. With Hands-free on, that's waiting quietly; with it off, the mic is closed. No Waiting State.
- **Thinking**: speech heard during it becomes the next Turn, and the pending Reply becomes an Interrupted Reply. The State **stays Thinking** while that speech is heard; the Orb shows it with a cue, not with Listening.
- **Speaking**: the Owner's voice, a tap or Push-to-talk cuts it short, leaving an Interrupted Reply.
- **Interrupted Reply** (new): a Reply the Owner didn't fully hear, either cut short or never spoken because the Owner had already said more. The Transcript keeps it whole and marked. A Reply whose speech *fails* is an error, not an Interrupted Reply.
- **Orb / Floating Orb / Jarvis App**: tap toggles Hands-free, hold is Push-to-talk, a tap while Speaking only cuts the Reply. Both Orbs show the Jarvis State *and* whether the mic is open. The Jarvis App keeps listening with its window closed.

**ADR:** [ADR 0011, Hands-free conversation replaces Push-to-talk as the way to talk](../../../docs/adr/0011-hands-free-replaces-push-to-talk.md). It supersedes the Push-to-talk-only decision in `.scratch/voice-mvp/spec.md`. ADR 0009 is **not** superseded: its global key and portal still hold, since tap versus hold needs press and release too. It gets a one-line cross-reference.
