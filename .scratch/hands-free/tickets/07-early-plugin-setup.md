# 07: Early Plugin setup

**What to build:** Jarvis starts setting up the Owner's Plugins while they are still speaking, so the 2–2.5 s it takes is hidden behind the Utterance and the pause. A setup that ends up unused (noise, another voice, nothing said) is kept for about a minute for the next Utterance, so a run of false starts costs one setup. Every Turn still gets a fresh setup, never one already used.

**Blocked by:** 02: A hands-free Turn on the Jarvis page

**Status:** ready-for-agent

Spec: [Hands-free conversation](../spec.md)

- [ ] The Turn module gains `prepare()`: it starts Plugin setup and keeps at most one prepared result in memory for about 60 s
- [ ] `take()` uses a prepared, unused setup if one is ready, and otherwise sets up fresh as today; a used setup is never reused
- [ ] A reply-prepare endpoint takes no body and returns at once
- [ ] The page calls it once the Listener confirms speech (about 500 ms of continuous speech, the same bar as barge-in) and at the start of a Push-to-talk hold; never on speech start alone
- [ ] Turn module tests cover using a prepared setup once, expiry after about 60 s, and no setup prepared; Session tests cover when prepare is called
- [ ] Measured by hand with a nonce in every timed request (Nan caches identical requests): a short spoken Turn is about 2 s faster
