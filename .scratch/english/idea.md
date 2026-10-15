# Idea: Jarvis in English

Status: idea, not yet charted

The Owner wants Jarvis entirely in English: the UI, the Jarvis persona and its Replies, and Jarvis's spoken voice.

What it touches, from what's known today:
- `/api/transcribe` sends `language: "es"` to Nan's Whisper.
- `/api/speech` uses a Spanish Kokoro voice.
- The chat model's instructions and the Jarvis persona answer in Spanish. `CONTEXT.md` says Jarvis answers "in Spanish".
- Every piece of UI copy, the Caption greeting and Session Titles.

Why it matters beyond itself: it makes a wake word possible (openWakeWord `hey_jarvis` or Porcupine `jarvis`, both English-only). See `.scratch/hands-free/issues/04-wake-word.md` and `07-how-a-conversation-opens.md`. The wake word is a follow-up to this effort, not part of hands-free conversation.
