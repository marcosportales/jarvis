# 05: Delete a Session

**What to build:** Each Session in the list has a "⋯" menu with "Eliminar". It opens a confirm dialog, and on confirm the Session and its Turns are permanently deleted and removed from the list. If it was the current Session, the Owner lands on `/` with a new, empty Session. Opening the old URL afterwards shows "Esta sesión ya no existe".

See `.scratch/sessions/spec.md` → "Deleting".

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] "⋯" → "Eliminar" → confirm deletes the Session; cancelling keeps it
- [ ] Deleting the current Session lands on a new Session
- [ ] The deleted Session's URL shows the "ya no existe" state
- [ ] Store test: delete cascades its Turns and the Session leaves the list
- [ ] Lint, typecheck and tests pass
