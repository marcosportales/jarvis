# Spec: Hands-free conversation

Status: ready-for-agent

Map: [Hands-free conversation](map.md) · ADR: [0011, Hands-free conversation replaces Push-to-talk as the way to talk](../../docs/adr/0011-hands-free-replaces-push-to-talk.md) · Vocabulary: `CONTEXT.md` (Hands-free, Utterance, Push-to-talk, Interrupted Reply, Jarvis State, Orb, Floating Orb)

## Problem Statement

Today the Owner can only talk to Jarvis by holding something down: the Orb, Space, or the global key. Every Turn means reaching for a key and keeping it pressed for as long as they speak. Talking to Jarvis feels like using a walkie-talkie, not like talking to someone. It's awkward when the Owner's hands are busy, or when Jarvis's window is closed and they're working in another app.

Once the Owner lets go, the wait is long too: 7–15 s before Jarvis starts to answer. Part of that wait (setting up the Owner's Plugins) can only start after the Owner has finished speaking, because Jarvis doesn't know a Turn is coming until then. If the Owner speaks while Jarvis is answering, Jarvis doesn't hear them. If they speak while it is Thinking, Jarvis ignores them. And Jarvis saves every Reply as if the Owner heard it all, even one they cut short.

## Solution

The Owner turns **Hands-free** on with a tap (the Orb, Space, the global key, or the Floating Orb). From then on Jarvis notices on its own when the Owner starts and stops speaking. While the Owner is silent it waits quietly and almost for free: voice detection runs locally, and nothing goes to Whisper or the chat model. When the Owner finishes, Jarvis answers. The Owner can talk over a Reply to cut it short, and what they say while Jarvis is Thinking becomes the next Turn. Another tap turns Hands-free off and closes the mic. Hands-free is always off when Jarvis starts.

Jarvis feels quicker too:
- Speech is transcribed in pieces while the Owner is still talking.
- Plugin setup starts while the Owner is still speaking.
- A soft sound confirms the moment a Turn is sent.

Holding still works as **Push-to-talk**, for a noisy room or for speaking once without opening the mic. It works the same on the Jarvis page and in the Jarvis App, including with the window closed. The Orb and the Floating Orb always show whether the mic is open.

## User Stories

### Turning Hands-free on and off

1. As the Owner, I want to tap the Orb to turn Hands-free on, so that I can talk to Jarvis without holding anything.
2. As the Owner, I want to tap Space on the Jarvis page to turn Hands-free on or off, so that I can do it from the keyboard.
3. As the Owner, I want to tap the global key in the Jarvis App to turn Hands-free on or off from any other app, so that I never have to switch windows to start talking.
4. As the Owner, I want to tap the Floating Orb to turn Hands-free on or off, so that I can do it with the mouse while the Jarvis window is closed.
5. As the Owner, I want Hands-free to stay on across any number of Turns and any length of silence, so that I don't have to turn it on again for every question.
6. As the Owner, I want a short sound when Hands-free turns on and a different one when it turns off, so that I know the tap worked even when I wasn't looking.
7. As the Owner, I want Hands-free to always be off when Jarvis starts, whether the Jarvis App starts with the computer or I open the Jarvis page, so that the mic never opens without me acting.
8. As the Owner, I want Hands-free to stay on when I close the Jarvis window, so that I can keep talking to Jarvis while I work in other apps.
9. As the Owner, I want a "Stop listening" item in the Jarvis App's tray menu, so that I can close the mic from there too.
10. As the Owner, I want turning Hands-free off to close the mic completely, so that turning it off is my mute.
11. As the Owner, I want Space to type a normal space while I'm typing in a text field, so that a tap of Space never turns Hands-free on by accident.
12. As the Owner, I want a short press to toggle and a longer press (past about 300 ms) to be Push-to-talk, so that one key does both without a second binding.

### Seeing that the mic is open

13. As the Owner, I want the Orb to look clearly different whenever the mic is open, so that I can always tell whether Jarvis can hear me.
14. As the Owner, I want the Floating Orb to show the same mic-open look, so that I can see the mic is open with every Jarvis window closed.
15. As the Owner, I want the mic-open look to show in every Jarvis State, including during a Push-to-talk hold with Hands-free off, so that the look means exactly "the mic is open".
16. As the Owner, I want Idle with Hands-free on to look different from Idle with it off, so that I can tell "waiting for me" from "not listening".
17. As the Owner, I'd like the tray icon to change while the mic is open, on desktops that have a tray, so that I can see it there too.

### Speaking a Turn hands-free

18. As the Owner, I want Jarvis to start an Utterance by itself when it hears me start speaking, so that I can just talk.
19. As the Owner, I want the Orb to show Listening while I speak, so that I know I'm being heard.
20. As the Owner, I want the start of my first word kept, e.g. the "Oye" in "Oye, ¿qué hora es?", so that Jarvis doesn't miss how I began.
21. As the Owner, I want Jarvis to wait for about 1.2 s of quiet before sending my Turn, so that my Spanish hesitations ("quiero que… eh…"), lists and thinking aloud aren't cut in two.
22. As the Owner, I want my speech transcribed in pieces while I'm still talking, so that the long pause doesn't add to the wait.
23. As the Owner, I want the pieces' texts joined into one message, with nothing transcribed twice, so that Jarvis gets what I said as a whole.
24. As the Owner, I want silence and background noise (a door, typing, a cough) never to become an Utterance, so that Jarvis doesn't react to them or waste Nan calls.
25. As the Owner, I want an Utterance with no words in it to be dropped quietly while Hands-free is on, so that Jarvis doesn't keep telling me "No te entendí" about noises.
26. As the Owner, I want Jarvis never to store my audio, on the computer or in Sessions, so that only the text of what I said is kept.
27. As the Owner, I want a soft, non-verbal sound the moment my Turn is sent, on every Turn (hands-free, Push-to-talk or typed), so that I know Jarvis got it and the remaining silence doesn't feel like nothing is happening.
28. As the Owner, I want that sound to be different from the Hands-free on/off sounds and from the queued-speech cue, so that I can tell them apart by ear.

### Faster answers

29. As the Owner, I want Jarvis to start setting up my Plugins once I've been speaking for about half a second, so that the 2–2.5 s it takes is hidden behind my speech and the pause.
30. As the Owner, I want a setup that wasn't needed (noise, another voice, nothing said) kept for about a minute for my next Utterance, so that a run of false starts costs one setup, not one each.
31. As the Owner, I want a Push-to-talk hold to start Plugin setup the same way, so that holding is just as fast.
32. As the Owner, I want every Turn to get Plugins that are up to date, so that a Plugin I just connected or disconnected is respected.

### Interrupting while Speaking

33. As the Owner, I want to cut a Reply short by talking over it on the Jarvis page, so that I can stop Jarvis the way I'd stop a person.
34. As the Owner, I want only about half a second or more of speech to cut a Reply, so that a cough, an "mm-hm" or a short noise doesn't stop Jarvis mid-sentence.
35. As the Owner, I want what I said over the Reply to become my next Utterance, with its start kept, so that I don't have to repeat it.
36. As the Owner, I want Jarvis never to hear its own Reply as an Utterance, so that it doesn't answer itself.
37. As the Owner, I want a tap while Jarvis is Speaking to only stop the Reply, leaving Hands-free as it was, so that I can silence Jarvis without closing the mic.
38. As the Owner, I want the Orb's look while Speaking to show that a tap stops the Reply, so that I know what a tap will do.
39. As the Owner, I want a hold while Speaking to cut the Reply and start Push-to-talk, as it does today, so that holding always means "let me talk".
40. As the Owner, I want typing a message while Speaking to cut the Reply, as it does today, so that typing still works the same.
41. As the Owner using the Jarvis App, I want Jarvis not to listen while it is Speaking until the App has been checked for echo, so that it never answers its own voice through my speakers. A tap or a hold still cuts the Reply.
42. As the Owner, I want a Reply that is cut short to stay whole in the Transcript, marked as interrupted, so that I can still read what Jarvis was saying.
43. As the Owner, I want Jarvis to know I didn't hear all of a Reply, and roughly where it was cut, so that it doesn't assume I heard something I didn't.

### Speaking while Jarvis is Thinking

44. As the Owner, I want what I say while Jarvis is Thinking ("…a las siete", "no, espera") to become my next Turn, so that adding something is never ignored.
45. As the Owner, I want several bits of speech during one Thinking joined into one queued Turn, so that Jarvis answers them together.
46. As the Owner, I want a Push-to-talk hold during Thinking to queue the same way, so that holding isn't ignored either.
47. As the Owner, I want the Orb to stay Thinking while I add something, with a cue that it heard me and queued it, so that I know it's coming next without the Orb flipping back and forth.
48. As the Owner, I want the Reply that was being prepared to be shown, not spoken, when I've already queued more, so that Jarvis doesn't recite an answer I talked over, and my next Turn goes out at once.
49. As the Owner, I want that unspoken Reply marked as an Interrupted Reply in the Transcript, and Jarvis told I didn't hear it, so that the Transcript and Jarvis's understanding match what happened.

### Push-to-talk as the fallback

50. As the Owner, I want to hold the Orb, Space or the global key for Push-to-talk whether Hands-free is on or off, so that I can always speak once on purpose, in a noisy room for example.
51. As the Owner, I want the mic to close again when I release a hold with Hands-free off, so that a hold never leaves the mic open.
52. As the Owner, I want releasing a hold to send the Utterance at once, without waiting for a pause, so that holding stays as quick as today.
53. As the Owner, I want a hold to belong to whatever started it, as today, so that releasing a different key can't end it.
54. As the Owner, I want a hold during a hands-free Utterance to take that Utterance over, so that the two never make two Turns out of one stretch of speech.

### The Jarvis App with its window closed

55. As the Owner, I want Hands-free to keep working with every Jarvis window closed, so that I can talk to Jarvis while I use other apps.
56. As the Owner, I want the Jarvis App to tell the Jarvis page when it is hidden, so that the page keeps listening at full speed instead of being treated as a background tab.
57. As the Owner, I want the Floating Orb to show the Jarvis State and the mic-open look relayed from the hidden Jarvis page, so that it is always accurate.

### Limits, failures and safe defaults

58. As the Owner, I want Hands-free to turn itself off with an inline error and the off sound if the mic is denied, unplugged or fails, or voice detection can't load, so that I'm never shown an open mic that isn't really listening.
59. As the Owner, I want to be able to keep typing when the mic or voice detection fails, as today, so that I can still use Jarvis.
60. As the Owner, I want the mic to stay closed after the Jarvis page reloads or crashes, so that "always off when Jarvis starts" holds then too.
61. As the Owner, I want Jarvis to fall back to one transcription per Turn when it nears Nan's Whisper limit (10 a minute), so that a chatty minute slows Jarvis down a little instead of failing a Turn.
62. As the Owner, I want speech with no pause at all to be cut before about 2 minutes, so that Nan never drops it.
63. As the Owner, I want the pause lengths, the speech thresholds and the minimum speech to interrupt kept configurable, so that they can be tuned to my voice and room.
64. As the Owner, I want Hands-free to work the same on the Jarvis page in a focused desktop browser tab as in the Jarvis App, so that I can use either.

## Implementation Decisions

### Vocabulary and states

- Hands-free is a separate on/off that sits beside the Jarvis State. It is not a new State. `JarvisState` stays `idle | listening | thinking | speaking`.
- The Session's snapshot gains:
  - `handsFree: boolean`
  - `micOpen: boolean`, true while Hands-free is on or a Push-to-talk hold is in progress. This is what the Orb and the Floating Orb draw from.
  - `queued: boolean`, true while speech heard during Thinking is waiting to become the next Turn.
- Transcript entries for a Reply gain an `interrupted` mark: either "cut short" with the share of audio played, or "never spoken".

### The Jarvis Session (the main module, extended)

- The Session stays the one deep module that owns the Jarvis State, the Transcript and every Turn rule. Its public interface grows from press/release Push-to-talk and send a typed message to:
  - `setHandsFree(on)`
  - `tap()`: toggles Hands-free, or only stops the Reply while Speaking
  - `pressPushToTalk()` and `releasePushToTalk()`
  - `sendTypedMessage(text)`
  - `teardown()`
  - the existing Browse operations
- A new injected adapter, the **Listener**, takes Recorder's place for capture. Recorder is removed, because a Push-to-talk hold also goes through the Listener. Its interface:
  - `open()` / `close()`: get or release the mic and voice detection. `open` fails if the mic is denied or voice detection can't load.
  - events: `speechStarted`, `speechConfirmed`, `pieceReady(audio, durationMs)`, `endOfTurn`, `failed(error)`.
    - `speechConfirmed` comes after about 500 ms of continuous speech.
    - `pieceReady` comes after about 500 ms of quiet.
    - `endOfTurn` comes after about 1200 ms of quiet.
  - `holdStart()` / `holdEnd()`: a Push-to-talk hold. Voice detection's own boundaries are ignored until the release, and the release yields the rest as the last piece plus `endOfTurn`.
  - `setSpeaking(on)`: switches the Listener to the stricter interrupt gate (about 500–600 ms of speech before `speechStarted`), or to half duplex (no events at all) where barge-in isn't enabled.
- The Listener keeps a pre-roll of about 400 ms, so a piece includes the start of the first word.
- Turn flow under Hands-free:
  - `speechStarted` → Listening.
  - Each `pieceReady` is sent to the Transcriber at once, and the texts are joined in order.
  - `endOfTurn` → Thinking, the acknowledgement sound plays, and the joined text is sent to the Brain once every piece has been transcribed.
  - An Utterance whose joined text is empty is dropped. Under Hands-free it is dropped silently: no hint. Push-to-talk keeps today's "No te entendí" hint and its 500 ms minimum.
- Speech during Thinking: the State stays Thinking and `queued` turns on. Its pieces are transcribed and joined into one queued message. When the pending Reply arrives:
  - it is appended as an Interrupted Reply, marked "never spoken", and is not spoken;
  - the queued message is sent at once as the next Turn.

  A hold during Thinking queues the same way. A typed message during Thinking queues the same way too, replacing today's "ignored".
- Speaking:
  - `speechStarted`, which on the Jarvis page only arrives after the stricter gate, cuts the Voice and marks the Reply "cut short" with the share played. Voice reports the share it played when it is stopped.
  - The speech that cut the Reply becomes the next Utterance.
  - `tap()` cuts the Reply only.
  - A hold cuts it and starts Push-to-talk.
- Hands-free off closes the Listener, unless a hold is in progress. In that case it closes on release.
- A Listener `failed`, or `open()` rejecting, turns Hands-free off with an inline mic error, as today's microphone error. Typing still works.

### Orb input (today's Push-to-talk arbiter, renamed and extended)

- A pure module over the same sources (Space, Orb, Jarvis App). It turns press/release pairs into either a **tap** (released within about 300 ms) or a **hold** (still down at 300 ms, so Push-to-talk starts then). It calls the Session's `tap()` or `press/releasePushToTalk()`.
- It keeps today's rules: a hold belongs to its source, and a page blur ends a page-made hold.
- The Floating Orb's existing `click` gesture becomes a tap.
- Space still never triggers inside a typing target.

### Jarvis App bridge and shell

- The Jarvis App bridge API:
  - **Global key:** the API gains a tap action. Holds keep using the existing press/release channel, and the Orb input module tells a tap from a hold in the page from the key's press and release timing.
  - **Mic-open look:** `publishJarvisState` also carries `micOpen` (and `handsFree`), so the Floating Orb shows it.
  - **Window visibility:** the shell tells the page when its window is hidden or shown. The page keeps listening either way.
  - The tray's "Stop listening" item, and an optional mic-open tray icon.
- ADR 0009's portal path doesn't change: the portal already reports press and release.
- In the Jarvis App, barge-in is off: the Listener is half duplex while Speaking. That's one setting to flip once the App's echo is measured.

### Browser adapters (behind the Listener and Voice)

- The Listener is built on Silero VAD v6 through `@ricky0123/vad-web`, self-hosted with its ONNX and worklet files served from the web app's public folder. `model: "v6"` must be set explicitly, because the default is `legacy`.
- Voice detection runs on one `getUserMedia` stream with the browser's echo cancellation on. It's the same page that plays the Reply, so echo cancellation sees the Reply audio.
- Starting values, all configurable:
  - start threshold 0.3 and end threshold 0.25
  - minimum speech 250 ms, or 500–600 ms while Speaking
  - pre-roll 400 ms
  - piece pause about 500 ms and end-of-turn pause about 1200 ms
- vad-web has no setting for two pause lengths. The two pauses are our own logic over its per-frame probabilities (`onFrameProcessed`).
  - The strategy functions from the end-of-turn prototype can be lifted across as they are: branch `prototype/hands-free-end-of-turn-pause`, the first `<script>` block of `end-of-turn-pause.html`, lane E.
- The energy level drives only the Orb's animation, never the gate.
- Audio is held only in memory, until its piece has been transcribed.
- Voice plays the Reply through a media element the page owns. `stop()` reports how much was played, as a share of the clip's duration.
- Short UI sounds play locally:
  - Hands-free on
  - Hands-free off
  - Turn sent
  - Speech queued

### Whisper budget and long speech (defaults until the map's fog is resolved)

- The Session counts Whisper calls in a rolling minute. Near the limit (8 of 10), it stops transcribing pieces early and sends the whole Utterance as one call at `endOfTurn`.
- Continuous speech with no pause is forced into a piece at about 90 s, below Nan's roughly 2-minute limit.
- These defaults stand until the **Very long Utterances and the Whisper budget** fog on the map is resolved.

### Server: early Plugin setup

- The Turn module gains a prepare operation, `prepare()`. It starts Plugin setup (today's `toolsForTurn()`) and keeps the result in memory for about 60 s, as at most one prepared setup.
  - `take()` uses a prepared setup if one is ready and unused, and otherwise sets up fresh as today.
  - A used setup is never reused. Every Turn still gets its own setup.
- A new reply-prepare endpoint takes no body and returns at once. The client calls it on `speechConfirmed`, or at the start of a hold.
- The server runs in one process (ADR 0009), so in-memory is enough.

### Server: Interrupted Reply

- The Turn request gains an optional mark for the *previous* Reply in the Session: `{ cut: share }` or `{ unspoken: true }`.
  - The server saves the mark on that Turn. This is a schema change: the saved Turn gains a nullable `interrupted` field.
  - It adds a note for the model ahead of the new message. The note says the Owner didn't hear that Reply, or heard about the first X% of it, estimated as that share of the text.
  - The exact wording to the model is up to the implementer and must be in Spanish, like the rest of the prompt.
- A resumed Session shows saved Interrupted Replies with their mark.

### Left open on the map (built with the defaults above)

- **Look and sounds:** the exact Orb, Floating Orb and Caption look and the four sounds are the open prototype ticket **How the Orb, Floating Orb and Caption show Hands-free and the cues**. Build them with placeholders that meet the rules above. That ticket replaces the placeholders.
- **Other voices in the room:** no special handling. The Owner's defence is turning Hands-free off.
- **Background tab and phone:** supported only in a focused desktop tab of a Chromium browser. In a background tab or on a phone, Hands-free is offered as is, with no guarantees.

## Testing Decisions

- **What a good test is here:** it drives a module only through its public interface and checks only what the Owner or the next module would see:
  - the Jarvis State
  - the Transcript entries and their marks
  - `handsFree`, `micOpen` and `queued`
  - what was Transcribed, asked of the Brain, or Spoken, and in what order

  It never checks timers, internal flags or vad-web calls. Fake timers stand in for the pauses.
- **The Jarvis Session** carries most of the tests. It extends the session test file and `session-fakes`, which already provide controllable fakes for the Brain and the Voice. Add a fake Listener whose events the test fires by hand, and a Voice fake that reports the share played. Scenarios:
  - A full hands-free Turn: Idle → Listening → Thinking → Speaking → Idle, with Hands-free still on afterwards.
  - Two pieces become one message, each transcribed once and in order.
  - The Brain is only asked once the last piece's text is back.
  - An empty Utterance under Hands-free is dropped with no hint.
  - Barge-in, a tap while Speaking, a hold while Speaking, and half duplex while Speaking:
    - the Reply is marked "cut short" with its share;
    - after a tap, Hands-free is still on;
    - in half duplex, Listener events are ignored.
  - Speech, a hold, or a typed message during Thinking:
    - the State stays Thinking and `queued` turns on;
    - the pending Reply is appended as "never spoken" and not spoken;
    - the queued message is sent next, with the mark on the request.
  - Hands-free off closes the Listener, but waits for a hold's release.
  - A Listener failure or a denied `open` turns Hands-free off and shows the inline error. Typing still works.
  - Hands-free is off in a new Session and after `teardown`.
  - The Whisper budget fallback switches to one call per Turn near the limit.
  - `prepare` is requested on `speechConfirmed` and at the start of a hold, but not on `speechStarted` alone.
- **Orb input:** extend the push-to-talk test style.
  - Tap versus hold at the 300 ms threshold, using fake timers.
  - A hold belongs to its source, and a blur ends a page hold.
  - A Floating Orb click is a tap.
  - Space inside a typing target does nothing.
- **App bridge:** extend the app-bridge test file.
  - The global key's tap action reaches the Session.
  - `micOpen` and `handsFree` reach the Floating Orb.
  - The hidden/shown notice reaches the page.
  - The bridge type still matches the desktop copy.
- **Desktop shell:** extend the existing controller and page-message tests for the tray's "Stop listening" and the visibility notice.
- **The Turn module (server):** extend the Turn test file.
  - `take` uses a prepared setup once, and sets up fresh after about 60 s or when no setup was prepared.
  - An `interrupted` mark is saved on the previous Turn, and the model is told.
  - A resumed Session returns the mark.
  - The request parser accepts and validates the new optional field. Extend the request test file.
- **Not unit-tested, checked by hand:**
  - vad-web, `getUserMedia`, echo cancellation and audio playback;
  - the window-closed path in the Jarvis App;
  - false triggers from a Reply on the speakers. The **Does Jarvis hear its own Reply on this machine's speakers?** test page is the measuring tool. Run it in the Jarvis App before enabling barge-in there.

## Out of Scope

- **A wake word ("Hey Jarvis…")** and **turning Hands-free off by voice**: these wait on Jarvis in English.
- **A system mic indicator in Caelestia**: it belongs to the Owner's desktop shell.
- **Faster Turns** (`.scratch/faster-turns/idea.md`): fewer chat model calls per Turn, keeping Plugin setup warm across Turns, and speaking the Reply as it streams.
- **Jarvis in English** (`.scratch/english/idea.md`).
- **Telling the Owner's voice apart from other voices**, and backing off from speech not meant for Jarvis: these are left to the map's **Other voices in the room** fog.
- **Hearing as a part of Jarvis Health**: this is left to the map's **Failure and Jarvis Health** fog.
- **Barge-in in the Jarvis App**: it stays off until the App's echo is measured. Flipping it on is a setting, not new work.

## Further Notes

- **The map isn't finished.** This spec was written while the map still had one prototype ticket and four patches of fog open (see map.md). Their defaults above are deliberately conservative. Each one changes in one place when its ticket resolves.
- **Measured basis:** the gap is 7–15 s today. Early Plugin setup should take about 2–2.5 s off every spoken Turn. Whisper takes about 1.5–3 s per Utterance whatever its length. Silero v6 is about 3.7 MB gzipped and uses an estimated 1–3% of a core while waiting.
- **Benchmarking Nan:** Nan caches identical requests, so put a random nonce in every timed request.
- **Prototypes** to lift from:
  - `prototype/hands-free-end-of-turn-pause`, for the pause strategies;
  - the own-Reply-on-speakers test page from **Does Jarvis hear its own Reply on this machine's speakers?**, for measuring echo.
