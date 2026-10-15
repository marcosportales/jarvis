# 10: How long a pause means the Owner is done?

Type: prototype
Status: resolved
Blocked by: 01, 02

## Question

Find, by feel, how long a pause should mean the Owner has finished speaking. It should be short enough that Jarvis feels as quick as a person, and long enough that it doesn't cut the Owner off mid-thought in Spanish.

Build a throwaway page with the chosen voice detection. It shows speech start and end live and has sliders for the end-of-speech pause, the minimum speech length and the pre-roll. Try it with real sentences, lists, hesitations ("eh…") and questions. Find out whether one fixed pause is enough or whether it has to adapt, e.g. shorter after a question-like ending, or a longer grace period before a Turn is sent.

## Answer

**Transcribe early, send late.** After about **500 ms** of quiet, send the speech so far to Whisper as a piece. Send the Turn only after about **1200 ms** of quiet, with the pieces' texts joined. If speech comes back between the two, the next piece is transcribed on its own and joined to the earlier text, so nothing is transcribed twice. This was lane E in the prototype; the Owner chose it.

**Why:**
- **One fixed pause is not enough for the Owner's Spanish.** 600 ms cut the hesitation ("quiero que… eh…"), the list and the thinking-aloud takes in two (it passed 2 of 5 takes). A pause that grows with how long the Owner has spoken (500 ms + 150 ms per second, up to 1300 ms) passed the takes but broke free speech into 4 Utterances.
- **900 ms and 1400 ms passed all five takes**, and the Owner finds about 0.9 s natural. But the pause is paid on top of Whisper's 1.5–3 s: 900 ms + Whisper.
- **E passed all five takes too, and its long pause is hidden.** Transcription starts about 0.5 s after the last word, and Whisper is still working when the 1.2 s pause ends. So the transcript is ready about 0.4 s sooner than with a fixed 900 ms, while it is as robust as 1400 ms. A short question costs one piece, so one Whisper call.

**Settings that passed:** Silero v6, start threshold 0.3, end threshold 0.25, minimum speech 250 ms, pre-roll 400 ms. Transcribing confirmed that a 400 ms pre-roll keeps "Oye" in "Oye, ¿qué hora es?". Whisper invented nothing from the quiet tail, so the tail can stay.

**Costs and caveats for the spec:**
- **More Whisper calls.** A Turn costs one call per piece: a short question 1, free talk 5 in one take. Nan allows 10 a minute, so a chatty minute can hit the limit. The spec needs a fallback for that, such as fewer, longer pieces, or waiting for the Turn and sending it whole.
- **Pieces are transcribed without the rest of the sentence.** Joining their texts worked in these takes but may cost accuracy on cuts mid-phrase.
- **These are starting values, not measured limits.** Each scenario had one take from one speaker in one room. Keep the two pauses configurable.
- **vad-web defaults to the `legacy` model.** Set `model: "v6"` explicitly.
- **The real build has no `redemptionMs` to set.** Two pause lengths need their own logic over vad-web's per-frame probabilities (`onFrameProcessed`), as the prototype does. vad-web's own segment ends could instead serve as the pieces, with a timer for the Turn. The pure strategies in the prototype's first `<script>` block lift straight across.

**Prototype:** branch `prototype/hands-free-end-of-turn-pause`, file `apps/web/public/prototypes/end-of-turn-pause.html`. Run `pnpm --filter web dev`, then open `/prototypes/end-of-turn-pause.html`.
