# 04: Jarvis talks about the results on screen

**What to build:** With results on screen, the Owner asks "¿y el segundo?", "¿cuál es el más barato?" or "¿de qué periódico es el primero?" and Jarvis answers from those results without searching again.
- The client sends what the Results Widget currently shows (heading, plus each result's title, subtitle, facts and source, without URLs) with each Turn, the way it already sends the Widget layout.
- The Turn adds it to the system prompt as a short Results notice, numbered as on screen. With nothing on screen there's no notice.
- The server stays stateless about results.

**Blocked by:** 03

**Status:** done

- [x] A Turn test: the Results sent with the request appear numbered in the system prompt, and none are added when nothing was sent
- [x] The reply route validates the new request field and rejects malformed input like it does the Widget layout
- [x] In the running app, "¿y el segundo?" after a Search gets the second result
- [x] Typecheck, lint and the full test suite pass
