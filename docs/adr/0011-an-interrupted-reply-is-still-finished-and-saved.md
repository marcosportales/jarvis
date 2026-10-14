---
status: accepted
---

# An interrupted Reply is still finished and saved, and the next Turn waits for it

Now that Speaking starts before the Reply is fully written, the Owner can cut Jarvis short while the server is still writing. The voice stops at once and every queued chunk is dropped, but the Turn is not cancelled: the server finishes the Reply, runs its tools and saves it, the Transcript fills in the rest as text, and the Owner's next message, already recorded and transcribed, is only sent once that earlier Turn is saved. The server likewise finishes a Turn whose page was closed or left for another Session. This keeps the order of Turns in a Session, gives a new Session its id before its second Turn, keeps tool side effects such as Remember or starting a Browse Task whole, and matches how an interrupted Reply already behaved: saved and shown in full.

## Considered Options

- **Cancelling generation and saving only what was spoken, or nothing.** Saves a few tokens, but leaves half-done Turns, tool calls cut off midway, and a history that no longer matches what the model wrote.
- **Not letting the Owner interrupt until the Reply is fully written.** Simple, but Push-to-talk would sometimes do nothing while Jarvis is audibly Speaking.

## Consequences

- The next Turn can wait in Thinking a little longer than it took to transcribe, when the earlier Reply is long or still running tools.
- If the earlier Turn fails, the next one is sent anyway; in a new Session that means it starts the Session itself.
