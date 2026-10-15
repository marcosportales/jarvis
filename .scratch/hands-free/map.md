# Map: Hands-free conversation

Label: wayfinder:map

## Destination

A spec at `.scratch/hands-free/spec.md`, ready for `/to-spec`, that replaces Push-to-talk with hands-free conversation: Jarvis notices on its own when the Owner starts and stops speaking, waits quietly and almost for free while the Owner is silent, and answers with person-like timing, on the Jarvis page and in the Jarvis App, including with its window closed.

## Notes

- **Domain:** use `CONTEXT.md` vocabulary (Owner, Utterance, Turn, Reply, Jarvis State, Orb, Floating Orb, Jarvis App, Caption, Jarvis Health). Utterance, Listening, Push-to-talk and Speaking are defined in terms of Push-to-talk today. Until **Domain: Utterance, Listening, Push-to-talk and a waiting Jarvis State** resolves, treat those definitions as up for change, not as constraints.
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

## Not yet specified

- **Other voices in the room.** A TV, a call, or someone else talking will look like speech. Whether Jarvis needs to tell the Owner's voice apart, or whether the opening mode (wake word, toggle) is enough protection, depends on what voice detection and the opening mode turn out to be.
- **Failure and Jarvis Health.** What happens when the mic is denied, unplugged or switched, or voice detection fails to load, how the mic comes back after the Jarvis page crashes or reloads, and whether "hearing" becomes a part of Jarvis Health.
- **How the Orb, Floating Orb and Caption show the new states.** This waits on the new Jarvis State(s) and on the privacy decision.
- **What happens to the Push-to-talk machinery:** the hold arbitration, the portal Global Shortcut, Space and holding the Orb. Retired, repurposed (for example as a mute or toggle key) or kept, depending on the opening mode.
- **Very long Utterances.** Monologues, pauses mid-thought, and Whisper's upload limits. This depends on the end-of-turn pause and on whether transcription can run while the Owner speaks.
- **The Jarvis page in a background tab or on a phone.** The browser may throttle or suspend audio work in a background tab, and phones behave differently again. How far "works on the Jarvis page" reaches is still open.

## Out of scope

<!-- work consciously ruled beyond the destination: gist + why, linking the closed ticket -->
