# 01: Confirm Composio's Search tools live and record fixtures

**What to build:** A written check, appended to this ticket under `## Answer`, of the seven `composio_search` tools the spec relies on (`COMPOSIO_SEARCH_WEB`, `COMPOSIO_SEARCH_FETCH_URL_CONTENT`, `COMPOSIO_SEARCH_NEWS`, `COMPOSIO_SEARCH_FLIGHTS`, `COMPOSIO_SEARCH_HOTELS`, `COMPOSIO_SEARCH_GOOGLE_MAPS`, `COMPOSIO_SEARCH_EVENT`). Call each one once through `@composio/core` with the existing `COMPOSIO_API_KEY` and the Owner's user id, using Spanish inputs (`hl=es`, `gl=es`, `EUR` where they apply). Save each raw response as a fixture next to the future Search module, trimmed to a few results, so the mapper tests can use real shapes. Finish by writing down the final shape of the **search port**. If any assumption is wrong in a way that changes what the Owner gets, stop and update the spec instead of working around it.

Check:
- The real input names and which are required, especially whether flights take city names or need IATA codes (`departure_id` / `arrival_id`) and how dates are formatted.
- The real output shape of each tool, and which fields carry the title, the key facts, the link and the source.
- Whether results come back in Spanish and euros with those inputs.
- How a failure looks (thrown error vs `successful: false` with `error`) and how long each call takes.
- That `composio_search` stays `NO_AUTH`: no connected account is needed.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Every point above answered, with the call made and what came back
- [ ] One trimmed fixture saved for each of the seven tools
- [ ] The final search port interface written down
- [ ] Spec updated if any assumption changed
