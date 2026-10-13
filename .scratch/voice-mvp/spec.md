# Spec: Voice MVP — talk to Jarvis

Status: ready-for-agent

## Problem Statement

The Owner wants a personal J.A.R.V.I.S.: an assistant they can simply *talk to* and that talks back. Today the repo is an empty Next.js + shadcn template — there is no way to have a spoken conversation. The Owner already pays for a Nan Builders subscription that provides a chat model (DeepSeek), speech recognition (Whisper) and speech synthesis (Kokoro), but nothing ties those together into a conversation.

## Solution

A single-page browser app where Jarvis appears as an animated Persona orb. The Owner holds the orb (or holds Space) and speaks in Spanish; on release, the Utterance is transcribed, Jarvis thinks up a short Reply, and speaks it aloud in a Spanish voice. Every Turn is also shown as text in a Transcript below the orb, and the Owner can type instead of speaking. The orb always shows what Jarvis is doing: Listening, Thinking, Speaking, or Idle. The conversation lasts for the Session only — reloading the page starts fresh.

## User Stories

### Talking to Jarvis

1. As the Owner, I want to press and hold the Persona orb to speak, so that talking to Jarvis feels like one obvious action.
2. As the Owner, I want to hold the Space key to speak, so that I can talk without reaching for the mouse.
3. As the Owner, I want Space to type a normal space when I'm focused in the text input, so that holding Space never hijacks my typing.
4. As the Owner, I want releasing push-to-talk to send my Utterance immediately, so that I don't need a separate "send" step.
5. As the Owner, I want my Utterance sent to Jarvis without a review/edit step, so that the conversation flows like speech.
6. As the Owner, I want to speak in Spanish and be understood, so that I can use my natural language.
7. As the Owner, I want Jarvis to reply in Spanish, so that the conversation stays in one language.
8. As the Owner, I want Jarvis's Reply spoken aloud in a consistent Spanish male voice, so that Jarvis feels like a character rather than a text box.
9. As the Owner, I want Jarvis's Replies to be short (one to three spoken sentences), so that I'm not waiting through long monologues.
10. As the Owner, I want Jarvis to remember what was said earlier in the Session, so that I can ask follow-up questions.

### Seeing what Jarvis is doing

11. As the Owner, I want the orb to show Listening while I hold push-to-talk, so that I know I'm being heard.
12. As the Owner, I want the orb to show Thinking from the moment I release until Jarvis starts speaking, so that I know my Utterance was received.
13. As the Owner, I want the orb to show Speaking while the Reply plays, so that I can connect the voice to Jarvis.
14. As the Owner, I want the orb to return to Idle once the Reply finishes, so that I know Jarvis is ready for the next Turn.

### Transcript and typing

15. As the Owner, I want each of my Utterances to appear as text in the Transcript, so that I can see what Jarvis understood.
16. As the Owner, I want each Reply to appear as text in the Transcript, so that I can re-read what Jarvis said.
17. As the Owner, I want the Transcript to scroll to the latest Turn, so that I always see the current exchange.
18. As the Owner, I want to type a message instead of speaking, so that I can use Jarvis in a quiet place or when the mic is unavailable.
19. As the Owner, I want Replies to typed messages to be spoken aloud too, so that Jarvis behaves the same however I address it.

### Interrupting

20. As the Owner, I want pressing push-to-talk while Jarvis is Speaking to stop the audio immediately, so that I can cut Jarvis off and say something new.
21. As the Owner, I want the interrupted Reply's text to stay in the Transcript, so that I don't lose what Jarvis was saying.
22. As the Owner, I want to be unable to start a new Turn while Jarvis is Thinking, so that Turns don't overlap and get out of order.

### Mistakes and failures

23. As the Owner, I want accidental taps (Utterances shorter than about half a second) to be ignored, so that brushing the orb doesn't create a Turn.
24. As the Owner, I want Utterances that transcribe to nothing to be ignored, so that silence never produces a made-up message like "Gracias."
25. As the Owner, I want a small "no te entendí" hint when an Utterance is discarded, so that I know to try again.
26. As the Owner, I want a clear inline error in the Transcript if the microphone permission is denied, so that I understand why voice isn't working.
27. As the Owner, I want typing to keep working when the microphone is unavailable, so that Jarvis is still usable.
28. As the Owner, I want a clear inline error if Nan fails (transcription, Reply, or speech), so that I know the Turn didn't complete.
29. As the Owner, I want Jarvis to return to Idle after any error, so that I can simply try again.
30. As the Owner, I want a Reply's text still shown even if speaking it fails (e.g. the browser blocks playback), so that I don't lose the answer.

### Session and privacy

31. As the Owner, I want the Session to reset when I reload the page, so that I start each conversation fresh.
32. As the Owner, I want my Nan API key kept on the server, so that it's never exposed in the browser.
33. As the Owner, I want to run Jarvis locally with no login, so that there's no friction for a single-person tool.

## Implementation Decisions

### Architecture

- **Cascade pipeline**: Utterance audio → Whisper (speech-to-text) → DeepSeek (Reply) → Kokoro (text-to-speech). No realtime speech-to-speech model.
- **Single provider**: Nan Builders, which is OpenAI-compatible at `https://api.nan.builders/v1`. Use the Vercel AI SDK's OpenAI provider pointed at that base URL; no custom provider.
- **Models**: chat model `deepseek-v4-flash`; Kokoro voice `em_alex`. The exact Whisper and Kokoro model IDs are unknown until the API key is available — discover them via Nan's model list and keep all four values (chat model, transcription model, speech model, voice) in one server-side config so they can be swapped.
- **Secrets**: `NAN_API_KEY` lives in the web app's local env file and is only read on the server.
- **Whole-Reply speech**: the Reply is generated in full, then sent to Kokoro in one request. Sentence-by-sentence streaming playback is deliberately deferred.

### Modules

- **Jarvis Session controller** (client, new — the deep module): owns the Jarvis State (Idle / Listening / Thinking / Speaking) and the Transcript, and orchestrates every Turn. Its small public interface is roughly: press push-to-talk, release push-to-talk, send a typed message, and read the current Jarvis State, Transcript, and latest hint/error. It enforces all the rules: discard short or empty Utterances, interrupt Speaking on push-to-talk, ignore new Turns while Thinking, show errors inline and return to Idle, keep a Reply's text even if speaking it fails.
  - It depends on four injected adapters, which are the only things that touch the outside world:
    - **Recorder**: start/stop capturing an Utterance; reports audio and duration; surfaces mic-permission errors.
    - **Transcriber**: audio → text.
    - **Brain**: Transcript → Reply text.
    - **Voice**: Reply text → audio playback, with the ability to stop playback and a signal when playback ends.
  - Real adapters wrap the browser (MediaRecorder, audio element) and the server endpoints; tests substitute fakes.
- **Server endpoints** (new, thin): three route handlers that forward to Nan via the AI SDK:
  - **Transcribe**: accepts the Utterance audio (whatever the browser's MediaRecorder produces, e.g. webm/opus), calls Whisper with a Spanish language hint, returns the text.
  - **Reply**: accepts the Session's Turns so far, prepends Jarvis's system prompt, calls the chat model, and returns the full Reply text (non-streaming).
  - **Speech**: accepts Reply text, calls Kokoro with the configured voice, returns audio bytes.
- **Jarvis system prompt**: defines the Jarvis persona — calm, capable butler-like assistant — and instructs it to always answer in Spanish in one to three short, speakable sentences (no markdown, lists or code, since the Reply is read aloud).
- **UI** (new): one page laid out as Persona orb (large, centered, top) → Transcript (scrolling) → text input (bottom), using ai-elements `Persona` (variant `obsidian`), `Conversation`/`Message`, and `PromptInput`, installed via the ai-elements registry into the shared UI package per the repo's shadcn monorepo convention.
  - The Persona is display-only, so it is wrapped in a press-and-hold button that forwards press/release to the Session controller (pointer events, so it works for mouse and touch).
  - A page-level key listener maps holding/releasing Space to press/release, ignored while focus is in a text field.
  - Persona `state` maps directly from the Jarvis State; `asleep` is unused.
- **Transcript ownership**: the Session controller is the single owner of the Transcript. The UI does not use `useChat` as a second source of truth; the Brain adapter is a plain request to the Reply endpoint.

### Turn rules (Session controller behaviour)

- Idle + press push-to-talk → Listening, Recorder starts.
- Speaking + press push-to-talk → Voice stopped, → Listening. The interrupted Reply stays in the Transcript.
- Thinking + press push-to-talk or typed message → ignored.
- Listening + release → if the Utterance is shorter than ~0.5s, discard, show "no te entendí", → Idle. Otherwise → Thinking, transcribe.
- Transcription empty/whitespace → discard, hint, → Idle. Otherwise append the Owner's Utterance text to the Transcript, ask the Brain.
- Typed message (from Idle or Speaking — Speaking is interrupted) → append to Transcript, → Thinking, ask the Brain.
- Reply received → append to Transcript, Voice plays it → Speaking; playback ends → Idle.
- Any adapter failure → inline error in the Transcript, → Idle. A Voice failure leaves the Reply text in place.

## Testing Decisions

- **One seam: the Jarvis Session controller.** Tests drive it only through its public interface (press, release, type) with fake Recorder / Transcriber / Brain / Voice adapters, and assert on externally visible results: the Jarvis State sequence, the Transcript contents, hints and errors, and which adapter calls were made (e.g. Voice was stopped on interrupt). No assertions on internal state shape.
- Cases to cover, at minimum: a happy-path spoken Turn; a happy-path typed Turn; a short Utterance discarded; an empty transcription discarded; interrupt while Speaking; input ignored while Thinking; mic permission denied (typing still works); Transcriber/Brain/Voice failures each returning to Idle with an inline error; Voice failure keeping the Reply text; multi-Turn Transcript passed to the Brain in order.
- **No automated tests for the server endpoints or the UI wiring** — they are thin pass-throughs. The endpoints are verified by a manual smoke test against the real Nan API once the key is present (one real spoken Turn end to end).
- **Prior art**: none — the repo has no tests yet. Add Vitest to the web app as part of the first ticket that needs it.

## Out of Scope

- Tools/actions (calendar, search, home control, etc.) — Jarvis only converses.
- Wake word, tap-to-start with silence detection, and full-duplex conversation.
- Sentence-by-sentence (streaming) speech playback.
- Persistence of Sessions across reloads; any long-term memory.
- Authentication, multiple users, deployment beyond running locally.
- Languages other than Spanish; voice selection UI; mute toggle.
- Editing a transcription before sending.
- Automatic retries on failure.
- Desktop/native packaging.

## Further Notes

- The repo is a Next.js 16.4 shadcn monorepo template; `AGENTS.md` requires reading the bundled Next docs in `node_modules/next/dist/docs/` before writing route handlers or pages.
- The domain vocabulary (Owner, Jarvis, Session, Turn, Utterance, Reply, Transcript, Push-to-talk, Jarvis State) is defined in `CONTEXT.md`; use it in code and tests.
- Whisper is known to hallucinate short phrases ("Gracias.", "Subtítulos por…") on near-silence. The ~0.5s minimum plus empty-check is the MVP mitigation; if hallucinations still leak through, a small blocklist is the next step.
- Natural follow-ups after the MVP: streaming sentence-level speech, tap-to-talk with silence detection, a mute toggle, and the first tools.
