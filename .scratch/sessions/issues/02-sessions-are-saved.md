# 02: Sessions are saved and survive a reload

**What to build:** The Owner talks on `/`. Once the first Turn is done, the Session is saved and the URL becomes `/sessions/<id>`, without interrupting Speaking. Reloading shows the same Transcript, and follow-ups still use the earlier context. Opening `/` again starts an empty Session. The server now owns the Transcript:

- **Sessions store** (new seam): start with a first Turn, add a Turn, last 20 Turns, full Transcript, delete. Over the shared database with an injected clock.
- **Reply contract:** the client sends `{ sessionId?, text }` (plus the Widget layout and coordinates as today) instead of all the lines. The server loads the last 20 Turns, replies, saves the Turn (creating the Session on the first one), and returns the Session id. A failed Turn saves nothing. An unknown Session id is a client error.
- **Client Session:** adopts the returned Session id and can be started from a saved Transcript. Inline errors are never sent or saved.
- `/sessions/[id]` loads the saved Transcript. An unknown id shows "Esta sesión ya no existe" with a "Nueva sesión" action. The "Jarvis" nav link counts `/sessions/*` as the Jarvis page.

See `.scratch/sessions/spec.md`.

**Blocked by:** 01

**Status:** done

- [x] Talk, reload: same Transcript, URL is `/sessions/<id>`
- [x] A follow-up after a reload uses the earlier Turns
- [x] `/` starts an empty Session; nothing is saved until its first Turn is done
- [x] Errors don't appear after a reload
- [x] An unknown Session URL shows the "ya no existe" state
- [x] Store tests: start, add, last-20 window, full Transcript order, unknown ids
- [x] Session tests: first Turn adopts the id and later Turns send it; errors never sent; starting from a saved Transcript
- [x] Navigation test: `/sessions/abc` is the Jarvis page
- [x] Plugins, Widgets and weather still work in a Session
- [x] Lint, typecheck and tests pass
