# 01: Prefactor: Push-to-talk captures through a Listener

**What to build:** Push-to-talk works exactly as today, but the Jarvis Session now captures every Utterance through a Listener adapter instead of the Recorder. The Listener can open and close the mic, start and end a hold, and report a piece ready (audio, duration) and the end of a turn. Its first implementation wraps today's MediaRecorder capture for holds. This makes the hands-free change easy without changing anything the Owner sees.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

Spec: [Hands-free conversation](../spec.md)

- [ ] The Session takes a Listener adapter in place of the Recorder; the Recorder interface is gone
- [ ] A Push-to-talk hold goes through the Listener's hold start/end, and its release yields the Utterance as a piece plus end of turn
- [ ] Push-to-talk behaves exactly as before on the Jarvis page and in the Jarvis App: the 500 ms minimum, the "No te entendí" hint, the microphone error, interrupting Speaking, ignored while Thinking, teardown releasing the mic
- [ ] The Session tests run against a fake Listener in the session fakes, whose events a test fires by hand, and all existing Session scenarios still pass
- [ ] Typecheck, lint and tests pass
