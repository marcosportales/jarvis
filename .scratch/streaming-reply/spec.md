# Spec: Streaming Reply — Jarvis speaks while it writes

Status: ready-for-agent

## Problem Statement

After the Owner speaks or types, Jarvis stays Thinking until the whole Reply is written, and then until all of it has been turned into audio, before a single word is heard. The wait is the chat model's time plus the speech synthesis time for the entire Reply, so the longer and more useful the Reply, and the more tools Jarvis uses, the longer the Owner sits in silence. It makes Jarvis feel slow and unlike a conversation, and while Jarvis uses a tool there is no sign it is doing anything.

## Solution

Jarvis starts speaking the first sentence of its Reply as soon as it is written, while it is still writing the rest. The Reply is spoken a sentence at a time, back to back, with no gaps, nothing out of order and nothing said twice, and the Transcript shows each part as it is spoken. What Jarvis says while it uses its tools, such as "déjame mirarlo", is now part of the Reply and is heard while the tool runs. Widgets change as soon as the tool that changes them finishes. Push-to-talk still cuts Jarvis short at once; the Reply is still finished, saved and shown in full, and the Owner's next message waits for it. Nothing about how much text Jarvis writes changes, only when it arrives.

## User Stories

### Hearing Jarvis sooner

1. As the Owner, I want to hear the first sentence of a Reply as soon as Jarvis has written it, so that I'm not waiting in silence for the whole Reply.
2. As the Owner, I want Jarvis to keep speaking the next sentences while it is still writing later ones, so that a long Reply doesn't mean a long wait.
3. As the Owner, I want the sentences of a Reply spoken in the order Jarvis wrote them, so that it always makes sense.
4. As the Owner, I want no gap between one sentence and the next, so that Jarvis sounds like one voice, not a string of clips.
5. As the Owner, I want no sentence spoken twice, so that nothing sounds like a glitch.
6. As the Owner, I want no sentence skipped, so that I never miss part of a Reply without knowing.
7. As the Owner, I want very short sentences such as "Claro." spoken together with the next one, so that the voice doesn't sound choppy.
8. As the Owner, I want a very long sentence split at a comma, so that I don't wait for the whole of it before hearing it.
9. As the Owner, I want numbers like "3,5" or "3.5" and abbreviations like "Sr." or "Dra." never treated as the end of a sentence, so that Jarvis doesn't pause in the middle of them.
10. As the Owner, I want Spanish "¿" and "¡" treated as the start of a sentence, never its end, so that questions and exclamations are spoken whole.
11. As the Owner, I want short Replies to sound just as they do today, so that the change only ever helps.

### Seeing what Jarvis is doing

12. As the Owner, I want the Orb to show Thinking until Jarvis actually starts speaking, so that Speaking always means I'm hearing it.
13. As the Owner, I want the Orb to switch to Speaking the moment the first sentence starts playing, not when text or audio merely arrives, so that the Orb matches what I hear.
14. As the Owner, I want the Jarvis entry in the Transcript to grow a part at a time, each part as it starts being spoken, so that I can read along with the voice.
15. As the Owner, I want the Transcript never to run ahead of the voice while Jarvis is Speaking normally, so that reading doesn't spoil or lose my place in what I'm hearing.
16. As the Owner, I want the Memory events of a Reply (what Jarvis Remembered or Forgot) shown on its entry once the Turn is done, so that they appear once and never get spoken.
17. As the Owner, I want the Orb to go back to Idle only after the last sentence has played and the Turn is saved, so that Idle means Jarvis is really done.

### Tools and Widgets during a Reply

18. As the Owner, I want to hear what Jarvis says before using a tool, e.g. "déjame mirar el tiempo", while the tool runs, so that the silence while it works is filled.
19. As the Owner, I want what Jarvis says around its tools kept in the Reply's text in the Transcript and in the saved Session, so that what I read and what I resume match what I heard.
20. As the Owner, I want Jarvis to keep using every tool it can today (Memory, Widgets, the weather, Search, Browse, the System Widget, my Plugins) in the middle of a Reply, so that streaming takes nothing away.
21. As the Owner, I want a Widget to change as soon as the tool that changes it finishes, so that the screen changes when Jarvis gets to that point of the Reply.
22. As the Owner, I want the Results Widget Shown as soon as a Search finds more than one Result, so that the Results are there while Jarvis sums them up.
23. As the Owner, I want the Browser Widget Shown as soon as a Browse Task starts, so that I can watch it while Jarvis tells me about it.
24. As the Owner, I want the System Widget Shown as soon as Jarvis checks the computer or Jarvis Health, so that the numbers are there while Jarvis talks about them.
25. As the Owner, I want Jarvis's own choice to Show, Hide or move one of those Widgets to still win, even if that means the Widget appears and then goes, so that Jarvis does what I asked.
26. As the Owner, I want the latest Search Outcome to reach the Results Widget during the Reply, so that I can open the links while Jarvis is still talking.
27. As the Owner, I want a Browse Task started by a Reply to show up in the Browser Widget as it does today, so that nothing about Browse changes.

### Cutting Jarvis short

28. As the Owner, I want pressing Push-to-talk while Jarvis is Speaking to stop the voice at once, even while Jarvis is still writing, so that I can always interrupt.
29. As the Owner, I want every sentence not yet heard dropped when I interrupt, so that Jarvis never carries on talking over me or after I'm done.
30. As the Owner, I want an interrupted Reply still finished and saved, so that the Session holds the whole Reply and whatever Jarvis did with its tools.
31. As the Owner, I want the rest of an interrupted Reply filled into the Transcript as text, without speaking it, so that I can still read what I cut off.
32. As the Owner, I want Widget changes and Memory events from the rest of an interrupted Reply still applied and shown, so that interrupting never leaves a tool's work half done.
33. As the Owner, I want my next Utterance captured and transcribed as usual after I interrupt, so that interrupting costs me nothing.
34. As the Owner, I want my next message to wait, in Thinking, until the interrupted Reply is saved, so that Jarvis sees my Turns in the right order and the Session stays whole.
35. As the Owner, I want a typed message sent while Jarvis is Speaking to behave the same way, so that typing and speaking are interchangeable.
36. As the Owner, in a brand new Session, I want my second message to land in the same Session as my first, even if I interrupted the first Reply before it was saved, so that one conversation never splits in two.
37. As the Owner, if the interrupted Reply fails, I want my next message sent anyway, so that a failure behind me doesn't block me.
38. As the Owner, I want leaving a Session (opening another, or closing the page) while Jarvis is still writing to stop the voice at once and still have the Reply saved, so that I find it whole when I come back.

### When something fails

39. As the Owner, if a sentence can't be turned into audio, I want Jarvis to try it once more straight away, so that a passing hiccup on Nan isn't noticed.
40. As the Owner, if a sentence fails a second time, I want Jarvis to stop speaking rather than skip it, so that I'm never misled by a Reply with a hole in it.
41. As the Owner, when the voice stops because of a failure, I want the rest of the Reply shown in the Transcript as text, followed by "No pude reproducir la respuesta en voz alta.", so that I can still read the answer and know why it went quiet.
42. As the Owner, when the voice fails, I want the Turn still saved, so that the Session keeps the Reply.
43. As the Owner, if Jarvis fails partway through writing a Reply, I want the sentences already on their way still spoken and kept in the Transcript, followed by "No pude obtener una respuesta. Inténtalo de nuevo.", so that I know what I heard and that it stopped.
44. As the Owner, when writing fails, I want nothing saved, as today, so that sending my message again simply starts a fresh Turn.
45. As the Owner, if the Session I'm in is deleted while Jarvis is writing, I want the same outcome as today when it's deleted while Thinking, so that a deleted Session behaves predictably.
46. As the Owner, I want Jarvis Health to still hear when thinking, speaking or remembering fails during a Turn, so that the System Widget stays truthful.
47. As the Owner, when Jarvis writes nothing at all, I want to hear the usual fallback ("Lo siento, no he podido terminar de consultarlo…"), so that a Reply is never silent.

### Cost

48. As the Owner, I want streaming to cost no more tokens than today, so that hearing Jarvis sooner isn't paid for in my Nan subscription.
49. As the Owner, I want Jarvis's private reasoning never spoken or shown, so that I only hear the Reply.

### Developer

50. As the developer, I want the chunking rules in one pure module, so that the Transcript and the voice always agree on the parts and the rules are easy to test.
51. As the developer, I want read-ahead, ordering, retry and stopping in a module with no browser code, so that the hardest part of this feature is tested without real audio.
52. As the developer, I want a dev-only log of the time from sending a message to the first audio and to the Turn being done, so that I can check by hand that the first sentence plays well before the Reply finishes.

## Implementation Decisions

### Research outcomes that shaped the design

- **Nan's Kokoro can't stream audio.** Measured in October 2026, Nan's speech endpoint sends the whole file at once, with or without `stream: true`, and a one-sentence clip takes 1–2 s, mostly a fixed cost per call. So the Reply is synthesized a chunk at a time, with read-ahead (ADR 0010).
- **deepseek-v4-flash streams through Nan with tool calls.** Over Chat Completions, which the app already uses via the provider's chat model, it streams reasoning, then text, then tool calls in pieces, then the token usage, with the first token after about 0.5 s. The AI SDK's `streamText` handles it as is; token usage is unchanged. Nan was intermittently failing during the probes (a 502 and a dropped connection), which is why failure handling matters here.

### The Turn (server)

- The Turn module streams instead of generating in one go: same model, system prompt, tools, step limit and Health reporting. It produces an ordered series of Reply events, and the Turn is still saved only once the Reply is fully written.
- **The Reply is the text of every step, joined**, not only the last step's text as today. The system prompt gains a line asking for at most a short sentence before using a tool. If nothing is written, the Reply is the existing fallback.
- **Generation is not tied to the connection.** If the client stops reading (the page closes, the Owner leaves the Session), the Turn still runs to the end and is saved (ADR 0011).
- **Widget changes go out as soon as each tool call finishes.** The Turn's own rules (Show the Results Widget after a list Search with more than one Result, the Browser Widget after a Browse Task starts, the System Widget after checking the computer or Jarvis Health) are applied as soon as their tool finishes, unless the model already did something with that Widget in this Turn. A later model change to that Widget then follows as its own change.
- The Search Outcome goes out as soon as the Search tool produces it; the latest one in the Turn wins.
- Reasoning text is never sent to the client, spoken or saved.

### The reply route contract

- The reply route answers with a stream of newline-separated JSON events instead of one JSON body. Each line is validated on the client. The events are:
  - `text` with a `delta`: Reply text as it is written.
  - `widgets` with `changes`: Widget changes, in the order they happened.
  - `search` with an `outcome`: the Turn's latest Search Outcome.
  - `done` with `sessionId`, the final `text` and `memoryEvents`: sent only after the Turn is saved. Its `text` is authoritative (e.g. the fallback).
  - `error`, with `gone` when the Session was deleted while Jarvis was writing.
- A request for a Session the server doesn't know is still answered with a plain 404 before the stream starts.
- The request body is unchanged.

### The Brain (client)

- The Brain's reply now yields the Reply events in order, ending with `done`, instead of resolving to one Reply. It throws on failure as today, and a 404 still becomes a Session-gone error.
- Notifying that Sessions changed and titling a new Session happen after `done`, as they do today after the Reply.
- An unreadable Search Outcome is still dropped, not shown.

### The Chunker

- A new pure module owned by the Session: text deltas go in, chunks come out; a final flush returns what is left.
- Cut after `.`, `?`, `!` or `…` followed by whitespace or the end of the text. `¿` and `¡` never end a sentence. Never cut inside a number ("3.5") or after a common abbreviation ("Sr.", "Sra.", "Dr.", "Dra.", "Ud.", "etc." when followed by more text).
- A chunk shorter than about 40 characters joins the next one. A sentence longer than about 250 characters is cut at a comma followed by whitespace, never at a decimal comma ("3,5").
- The first chunk is as short as these rules allow. Later chunks may group several sentences.

### The Voice and the Speech

- The Voice now begins one Speech per Reply and can stop it. A Speech takes chunks in order, is told when no more are coming, reports each chunk the moment its audio starts playing, and settles when everything said has played or it was stopped. It rejects when a chunk failed twice.
- **The Speech queue** is a new module with no browser code, built on two ports: synthesize a chunk's text into audio, and schedule audio to play right after whatever was scheduled before it, reporting when it starts and ends. It:
  - requests audio for at most two chunks ahead of the one playing, in order;
  - plays chunks strictly in order, whatever order their audio arrives in;
  - retries a failed chunk once, straight away, then fails the Speech without playing anything after it;
  - on stop, silences the chunk playing now, drops everything queued or being fetched, and never plays it later.
- The browser adapter only wires the queue to the speech route and to the Web Audio API, scheduling each decoded buffer exactly where the previous one ends so there is no gap.

### The Session

- Feeds the Reply's text into the Chunker and each chunk into the Speech; applies Widget changes and the Search Outcome as their events arrive.
- The Jarvis State becomes Speaking when the first chunk starts playing. Each chunk is added to the Jarvis Transcript entry when it starts playing. Memory events are added to the entry at `done`.
- Idle comes once the Speech has finished and `done` has arrived.
- **Interrupting** (Push-to-talk or a typed message while Speaking) stops the Speech at once. The interrupted Turn keeps reading its events without speaking: the rest of its text fills into its Transcript entry as it arrives, and its Widget changes, Search Outcome and Memory events still apply. The Session keeps a "previous Turn settled" promise; the next Turn records and transcribes as usual, then waits on it, in Thinking, before asking the Brain, and uses the Session id from the earlier Turn's `done`. If the earlier Turn failed, the next Turn is sent anyway.
- **Leaving the Session** (teardown) stops the Speech and ignores everything the Turn sends afterwards, as today.
- **The voice failing:** the Speech is stopped, the rest of the Reply fills into the Transcript as text as it arrives, then the voice error entry is added; Idle after `done`.
- **Writing failing:** chunks already given to the Speech finish playing, nothing more is added, the spoken text stays in the Transcript, then the reply error entry is added; nothing is saved. A Session deleted meanwhile is handled as today (the Session is marked gone).

## Testing Decisions

- Good tests here check behaviour the Owner or the next module can see (what is spoken, in what order, what the Transcript and Jarvis State show, which events come out) through each module's public interface, never internal buffers, timers or call counts beyond what the fakes record as heard.
- **The Session**, through the existing session test seam, with the fakes reworked: a fake Brain that sends events one at a time and can hold its stream open, and a fake Voice whose Speech records chunks said and lets the test start and finish each one. Tests cover:
  - the first chunk is said, the Jarvis State is Speaking and the Transcript shows it while the Brain's stream is still open (the "done when" check);
  - chunks are said, and appear in the Transcript, in order, each once;
  - Speaking begins at the first chunk's start, not at the first text; Idle only after the last chunk ends and `done` arrives;
  - interrupting stops the Speech, nothing more is said, the rest fills the Transcript as text, and later Widget changes and Memory events still apply;
  - the next Turn waits for the interrupted one's `done`, and uses its Session id in a new Session; it is still sent when the earlier Turn fails;
  - the voice failing and the Brain failing partway, with the error entries above;
  - teardown mid-Reply ignores everything afterwards.
  Prior art: the existing Session tests and their fakes.
- **The Speech queue**, with a fake synthesizer whose calls the test resolves or rejects in any order, and a fake player that records what was scheduled and lets the test start and end each one. Tests cover: audio arriving out of order still plays in order; a slow first chunk holds the others back; at most two chunks are requested ahead; a chunk that fails then succeeds plays once; a chunk that fails twice fails the Speech and nothing after it plays; stop mid-chunk with two fetched ahead plays nothing more, even when their audio arrives later.
- **The Chunker**, as a pure function over sequences of deltas, including deltas that split a sentence end, a number or an abbreviation across two pieces, the minimum and maximum lengths, and `¿`/`¡`.
- **The Turn**, through its existing test seam, with the mock language model's stream instead of its generate call: text from every step makes up the Reply; events come out in order; Widget changes come out when their tool finishes, including the Turn's own Show rules and the model winning; the Turn is saved only once, after the text is done, and not at all on failure; it still runs to the end and saves when the consumer stops reading; reasoning never appears. Prior art: the existing Turn tests over the mock model.
- **The reply route contract**: the client's parsing of the event lines is tested with recorded lines, including an unreadable Search Outcome and an invalid line.
- The browser Web Audio wiring is checked by hand in the real app, together with the dev-only timing log (time to first audio against time to `done`, on a long Reply with a tool call).

## Out of Scope

- Streaming audio from a single call per Reply, or replacing Nan's Kokoro with another speech service (see ADR 0010).
- Cancelling generation on interrupt or saving only what was spoken (see ADR 0011).
- Interrupting while Jarvis is Thinking or Listening: unchanged.
- Speeding up transcription, or streaming the Owner's speech to Whisper.
- Changing what Jarvis says or how long its Replies are, beyond the one prompt line about short sentences before a tool.
- Any change to the Session list, Session titles, or how Turns are stored.
- New Jarvis Health parts or metrics; the timing log is dev-only.
- The Jarvis App and the Floating Orb need nothing beyond following the Jarvis State as they already do.

## Further Notes

- Glossary updated: **Reply** now includes what Jarvis says while using its tools and is spoken a sentence at a time; **Speaking** can start before the Reply is fully written and an interrupted Reply is still finished and saved.
- ADR 0010 records sentence-at-a-time synthesis; ADR 0011 records that an interrupted Reply is finished and saved and the next Turn waits for it.
- The thresholds (about 40 and 250 characters, two chunks ahead) are starting points to tune by ear in the real app; they live in one place each.
- Nan failed intermittently during research; the single retry per chunk is meant for exactly that.
