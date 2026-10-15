# Map: Hands-free conversation

Label: wayfinder:map

## Destination

A spec at `.scratch/hands-free/spec.md`, ready for `/to-spec`, that replaces Push-to-talk with hands-free conversation: Jarvis notices on its own when the Owner starts and stops speaking, waits quietly and almost for free while the Owner is silent, and answers with person-like timing, on the Jarvis page and in the Jarvis App, including with its window closed.

## Notes

- **Domain:** use `CONTEXT.md` vocabulary (Owner, Utterance, Turn, Reply, Interrupted Reply, Hands-free, Push-to-talk, Jarvis State, Orb, Floating Orb, Jarvis App, Caption, Jarvis Health). The Voice terms were rewritten for hands-free; ADR 0011 records the switch.
- **Hard limits:** every ticket answers to these.
  1. Silence and background noise never reach Whisper or the chat model.
  2. Jarvis never hears its own voice as an Utterance.
  3. The Owner can always tell whether the mic is open.
- **Wanted:** no transcription or model calls while the Owner is silent; the gap from the Owner finishing to Jarvis starting to answer as short as possible; works on the Jarvis page and in the Jarvis App, including with its window closed.
- **Skills:** grilling tickets call `grilling` + `domain-modeling`; prototype tickets call `prototype`; research tickets are resolved by a subagent that calls `research` and commits its findings to a throwaway `research/hands-free-<slug>` branch, pointed at from the ticket.
- **Where things are today:** capture is `getUserMedia({ audio: true })` + `MediaRecorder` in `apps/web/lib/jarvis/browser-adapters.ts`; the Reply plays through a plain `new Audio(blob)` from `/api/speech` (Kokoro, not streamed); `/api/transcribe` sends one blob to Nan's Whisper (`language: "es"`); holds are arbitrated in `apps/web/lib/jarvis/push-to-talk.ts`; the global key comes through the XDG portal (`apps/desktop/src/portal-shortcuts.ts`, ADR 0009). Push-to-talk itself has no ADR; it was decided in `.scratch/voice-mvp/spec.md`.
- **Benchmarking Nan:** Nan caches identical requests; put a random nonce in every timed request.

## Decisions so far

<!-- one line per closed ticket: [title](issues/NN-slug.md): gist -->

- [Can the Jarvis App keep listening with its window closed?](issues/05-mic-with-window-closed.md): Yes. The mic and voice detection live in the Jarvis page in the hidden Jarvis window, which already survives close, unthrottled and with the mic granted. The shell tells the page when it's hidden, and the Floating Orb shows the mic is open, because Hyprland and Caelestia show nothing.
- [Can a wake word ("Jarvis…") be detected locally?](issues/04-wake-word.md): Possible but nothing is ready to use. Porcupine has an English `jarvis` in the browser, but behind an AccessKey with no personal plan. openWakeWord's `hey_jarvis` is Python-only and non-commercial. There are no Spanish error rates, and voice detection is still needed to end the Utterance.
- [Voice detection that runs locally in the browser and the Jarvis App](issues/01-local-voice-detection.md): Silero VAD v6 through `@ricky0123/vad-web`, self-hosted in `public/vad/`. About 3.7 MB gzipped and an estimated 1–3% of a core while waiting. It rejects noise far better than WebRTC VAD (0.87 vs 0 on ESC-50). The energy level only drives the Orb, never the gate.
- [Echo cancellation so Jarvis doesn't hear its own Reply](issues/03-echo-cancellation.md): Chromium/Electron echo cancellation on Linux already cancels any Reply audio the same app plays, but not other apps' audio and not with zero leftover echo, so the listener must be the player. Use it plus a stricter detection gate while Speaking, with half duplex as the fallback. PipeWire's echo-cancel is an opt-in extra.
- [Can Whisper on Nan transcribe while the Owner is still speaking?](issues/02-whisper-while-speaking.md): No streaming on Nan, but a finished Utterance takes about 1.5–3 s whatever its length, so transcribe once the Owner stops. Pieces cut in pauses only pay off for long monologues. Nan allows 10 Whisper requests a minute and drops audio over about 2 minutes.
- [How a conversation opens: always listening, a wake word, or a toggle?](issues/07-how-a-conversation-opens.md): A toggle. While it's on, every stretch of speech becomes an Utterance, and it stays on until the Owner turns it off. A tap on the Orb, Space or the global key toggles; a hold is still Push-to-talk. The same on the Jarvis page and in the Jarvis App.
- [Measure where the gap goes between the Owner finishing and Jarvis speaking](issues/06-where-the-gap-goes.md): 7–15 s today, mostly fixed costs. Each Nan chat call costs about 2–3 s whatever the prompt size, and a tool Turn makes three. Composio Plugin setup adds 2–2.5 s to every Turn. Whisper takes 1–2.5 s and Kokoro 1–1.7 s. Streaming the Reply would save at most 1–2 s, and only on long Replies.
- [Privacy: when is the mic open, and how does the Owner know?](issues/09-privacy-and-mic-indicator.md): Hands-free is always off when Jarvis starts and stays on when the window closes. The Orb and Floating Orb take a distinct look while the mic is open, a sound plays on each toggle, and the tray icon may change too. Turning hands-free off is the mute. Jarvis never stores audio; it goes only to Nan, to be transcribed.
- [How long a pause means the Owner is done?](issues/10-end-of-turn-pause.md): One fixed pause isn't enough (600 ms cuts Spanish hesitations). Instead, transcribe early and send late: speech goes to Whisper in pieces after about 500 ms of quiet, and the Turn is sent after about 1200 ms. That is as robust as a 1.4 s pause, with the wait hidden behind Whisper, but it costs one Whisper call per piece.
- [Does Jarvis hear its own Reply on this machine's speakers?](issues/13-own-reply-on-speakers.md): Not in Chrome at normal volume. Over 20 Replies there were 0 false triggers and the Reply scored at most 0.1, against a 0.3 threshold, so the normal gate is enough. All 7 takes spoken over a Reply were caught in about 250 ms. The Jarvis App (Electron), maximum volume, headphones and Whisper on speech over a Reply are unmeasured, so half duplex stays as the fallback.
- [Interrupting: does speaking over Jarvis cut it short?](issues/08-interrupting.md): Yes on the Jarvis page, after about 500–600 ms of speech, so coughs and "mm-hm" don't cut it. The Jarvis App stays half duplex until measured. A tap while Speaking stops the Reply only. A cut Reply stays whole in the Transcript, marked as an Interrupted Reply, and the model is told. Speech during Thinking queues as the next Turn, and the pending Reply is then shown, not spoken.
- [Does this spec also shorten Thinking?](issues/11-shorten-thinking-scope.md): Only where hands-free helps. Plugin setup starts after about 500 ms of speech, hidden behind the Utterance and the pause, which saves about 2–2.5 s per Turn. An unused setup is kept about 60 s for the next Utterance. A soft, non-verbal acknowledgement sound plays on every Turn sent. Everything else goes to Faster Turns.
- [Domain: Utterance, Listening, Push-to-talk and a waiting Jarvis State](issues/12-domain-and-adr.md): Hands-free is an on/off separate from Jarvis State, so there's no Waiting State, and Idle with Hands-free on is waiting. An Utterance is one Turn's speech. Push-to-talk is the hold fallback. Thinking stays Thinking while queued speech is heard. Interrupted Reply is added. Recorded in ADR 0011, which supersedes the voice-mvp spec's Push-to-talk, not ADR 0009.

## Not yet specified

- **Other voices in the room.** A TV, a call, or someone else talking will look like speech. The opening mode is a toggle with no wake word, so the Owner's defence is turning hands-free off. Still open: whether that's enough, or whether Jarvis needs something more (telling the Owner's voice apart, or backing off when it keeps hearing speech that isn't meant for it). Every false trigger also spends one of Nan's 10 Whisper requests a minute.
- **Failure and Jarvis Health.** What happens when the mic is denied, unplugged or switched, or voice detection fails to load, how the mic comes back after the Jarvis page crashes or reloads, and whether "hearing" becomes a part of Jarvis Health.
- **Very long Utterances and the Whisper budget.** Transcribing in pieces already cuts long speech at every pause of about 500 ms, so Nan's limit of about 2 minutes per request only bites on speech with no pause at all (a cap). The live question is now the budget: each piece is a Whisper call, Nan allows 10 a minute, and free talk spent 5 in one take. What Jarvis does near or at the limit (fewer, longer pieces, or falling back to one call per Turn), and how false triggers from other voices eat into it, is still open.
- **The Jarvis page in a background tab or on a phone.** The browser may throttle or suspend audio work in a background tab, and phones behave differently again. How far "works on the Jarvis page" reaches is still open.

## Out of scope

<!-- work consciously ruled beyond the destination: gist + why, linking the closed ticket -->

- **A wake word ("Hey Jarvis…")**: nothing usable exists for a Spanish speaker. It becomes possible once Jarvis is in English, so it's a follow-up to that effort. See [How a conversation opens](issues/07-how-a-conversation-opens.md) and [Can a wake word be detected locally?](issues/04-wake-word.md).
- **Turning hands-free off by voice**: a tap does the same job; it belongs with the wake word follow-up. See [How a conversation opens](issues/07-how-a-conversation-opens.md).
- **A system mic-in-use indicator in Caelestia** (a PipeWire privacy indicator): it belongs to the Owner's desktop shell, not Jarvis. See [Privacy](issues/09-privacy-and-mic-indicator.md).
- **Faster Turns** (fewer chat model calls per Turn, keeping Plugin setup warm across Turns, speaking the Reply as it streams): these change how the model and tools are called, not how Jarvis listens. Noted in `.scratch/faster-turns/idea.md`. See [Does this spec also shorten Thinking?](issues/11-shorten-thinking-scope.md).
- **Jarvis in English** (UI, persona, Replies, voice): the Owner's own follow-up effort, noted in `.scratch/english/idea.md`.
