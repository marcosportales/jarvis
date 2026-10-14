# 03: Confirm Composio's Google Maps tools and record fixtures

**What to build:** Find out exactly how Jarvis will call Composio's `google_maps` toolkit, the way the Search and Gmail confirming tickets did, so the Map tickets build on facts. Record the answers in this file under `## Comments`.
- Which slugs and arguments, and the toolkit version to pin, for each of:
  - text search
  - nearby search
  - place details
  - Routes (`GET_ROUTE`) for car, walking, public transport and bike
  - geocoding
- The field masks that return just what the spec's Place and Route shapes need, including location and an encoded polyline.
- How the tools are executed with the API-key connection from 02. Do they need the connected account id, or are they `NO_AUTH`-like?
- Typical latency and response size, and any errors seen (bad address, no route, quota).
- Save a realistic recorded response for each tool as test fixtures, trimmed of anything personal.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Findings written under `## Comments`, with the slugs, arguments, field masks and pinned toolkit version
- [ ] Recorded fixtures exist for places (text and nearby), place details, a Route per travel mode, geocoding, and one failure
- [ ] Any surprise that changes the spec is written into `../spec.md`
