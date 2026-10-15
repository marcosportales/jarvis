# 06: Measure where the gap goes between the Owner finishing and Jarvis speaking

Type: task
Status: resolved
Blocked by: none
Findings: branch `research/hands-free-where-the-gap-goes`, folder `.scratch/hands-free/research/where-the-gap-goes/`

## Question

Nothing to decide here. Measure today's Turn timeline from the end of an Utterance to the first sound of the Reply, so the decision about shortening Thinking has numbers to stand on. Time each step: upload, Whisper, the chat model to its first token and to the full Reply, `/api/speech` (Kokoro), and the start of playback.

AFK. Use a few real Spanish Utterances of different lengths (a short command, one sentence, a paragraph), with a nonce in each request because Nan caches identical requests. Record the numbers and the method in the Answer. No product code changes.

## Answer

**Today a Turn takes 7–15 s from the end of the Utterance to the first sound of the Reply. Most of it is fixed costs that are paid again and again, not the work itself.** Each Nan call costs about 2 s however small it is. Composio sets the Plugins up again on every Turn. A Turn that uses a tool calls the chat model three times. Hands-free adds the end-of-turn pause on top.

**Medians of 3 timed Turns per Utterance** (range in brackets), after one warm-up round:

| Step | Short, 1 s ("¿Qué hora es?") | One sentence, 3 s (weather) | Paragraph, 16 s (menu) |
|---|---|---|---|
| Transcribe (`/api/transcribe` → Whisper) | 1.1 s (1.1–1.2) | 1.5 s (1.3–3.4) | 2.3 s (1.7–2.4) |
| Plugin setup (Composio), before the model starts | 2.5 s (2.0–2.5) | 2.5 s (1.9–2.7) | 2.2 s (2.1–3.1) |
| Chat model | 2.8 s, 1 call | 7.1 s, 3 calls (7.0–7.4) | 4.0 s, 1 call (3.2–4.7) |
| Tools (Open-Meteo) | — | 0.5 s | — |
| Speech (`/api/speech` → Kokoro, whole mp3) | 1.4 s (0.8–1.5) | 1.0 s (0.9–1.2) | 1.7 s (1.3–2.4) |
| Playback start (`new Audio` → `playing`) | ~3 ms (45 ms the first time) | | |
| **Total** | **7.3 s (7.1–8.0)** | **12.6 s (11.8–15.1)** | **9.5 s (9.2–12.5)** |

Uploading to the local route, and the route's own overhead, cost under 20 ms. After the model finishes, `/api/reply` saving the Turn costs under 10 ms.

**What the numbers show:**

- **The chat model has a floor of about 2–3 s per call, and prompt size doesn't change it.** A one-line prompt (34 tokens) took 2.2–3.1 s. The real "¿Qué hora es?" request took about the same with all 24 tools (11.3k tokens), without the Gmail tools (8.1k) and with no tools (3.1k). Ping to Nan is 19 ms, so the time goes inside Nan. Trimming the prompt won't help. Fewer calls per Turn will.
- **Tool Turns pay that floor three times.** The weather Turn called `get_weather`, then `show_widget` (about 2 s just to Show the Widget), then wrote the Reply.
- **Plugin setup costs 2–2.5 s at the start of every Turn, in sequence.** Composio `connected_accounts`, then a new `tool_router/session`, then about six MCP handshake requests, and only then the model. That's a third of a short Turn, and it happens even when the Turn uses no Plugin.
- **Streaming the Reply saves little.** 15 chat requests replayed with `stream: true` and a nonce: the first token came at 1.9–4.2 s, the first sentence 0–0.5 s after it, and the full answer 0–1.3 s after that. Most of a call is waiting before the first token, not generating. Kokoro on the first sentence alone took 0.9–2.5 s, against 0.8–2.4 s for the whole Reply. Speaking sentence by sentence would save at most 1–2 s, and only on long Replies like the menu.
- **Whisper is as [Can Whisper on Nan transcribe while the Owner is still speaking?](02-whisper-while-speaking.md) found:** 1–2.5 s, growing slowly with length, with one 3.4 s outlier.

**Tail risk:** 2 of the 20 streamed replays waited about 95 s at Nan before the first token. That never happened in the 12 real Turns, but a stalled call would leave Jarvis Thinking for a minute and a half.

**Method:** a production build of the web app with a copy of the Owner's database and the real Nan and Composio keys. A `fetch` preload timed every outbound call, with no product code changed. Kokoro-made Spanish Utterances were sent as webm/opus like MediaRecorder, with random leading silence and a new Session each Turn so Nan's cache never answered. Streaming, prompt size and the floor were measured by replaying the captured chat requests with a nonce. Playback was timed in Chrome with Playwright. Scripts, raw results and the setup are in `.scratch/hands-free/research/where-the-gap-goes/` on the branch `research/hands-free-where-the-gap-goes`.

**Caveats:**
- Only 3 timed Turns per Utterance, all at about 03:30 at night, when Nan may be quieter than in the day.
- The Utterances were made by Kokoro, not the Owner's voice.
- Playback was timed headless, and a real PipeWire sink adds a few tens of ms.
- The time from MediaRecorder stopping to the blob being ready wasn't measured.
