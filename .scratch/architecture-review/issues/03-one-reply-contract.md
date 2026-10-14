# 03: One Reply contract across the wire; the Brain adapter stops reaching out

**Strength:** Worth exploring · **Dependencies:** ports & adapters

**Status:** needs-triage

**Blocked by:** 01 (re-check after it lands; titling may move server-side as part of 01)

**Files:** `apps/web/lib/jarvis/browser-adapters.ts` (`httpBrain`), `lib/jarvis/session.ts` (`ReplyRequest`, `Reply`), `app/api/reply/route.ts`, `app/sessions/actions.ts` (`titleSession`)

**Problem:** The request and the Reply are defined separately on the client and the server, with no shared schema. The client casts the response `as Reply`. `httpBrain` also reaches outside its port:
- It adds the Widget layout (`getWidgetBoard().describeLayout()`) and the Owner's location (`ownerLocationIfGranted()`) to the request from singletons, so `ReplyRequest` covers only 2 of the 4 fields.
- It triggers Session titling by importing `titleSession` from `app/`, so a `lib/` module depends on `app/` and neither `session.ts` nor its tests can see the titling.

**Solution:**
- One schema for the request and the Reply, shared by both sides.
- The Widget layout and coords enter through the Brain port's own interface.
- Titling moves behind the server-side seam.

**Wins:**
- The adapter becomes a pure HTTP adapter.
- One schema catches drift between client and server.
- `lib/` no longer imports `app/`.

## Comments
