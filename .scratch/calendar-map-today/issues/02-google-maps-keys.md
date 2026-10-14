# 02: Google Maps keys and the Composio connection

**What to build:** Set up the one-time access the Map needs, outside the repo (ADR 0008). A human has to do this: it needs a Google account with billing and the Composio dashboard. Prefer generating a step-by-step wizard (`/mattpocock-skills:wizard`) for the Owner to run.
- Create a Google Cloud project with billing enabled. Enable the Maps JavaScript API, Places API (New), Routes API and Geocoding API.
- Create a **browser key** limited to the Maps JavaScript API and to Jarvis's origins (localhost for development and the deployed origin).
- Create a **server key** limited to Places, Routes and Geocoding, with no origin restriction.
- In Composio, create a `google_maps` connection using the server key (API-key auth), owned by Jarvis's single Composio user.
- Add the browser key and the Composio connection id to env, documented in the env example the way the Composio API key is.
- Set a budget alert on the Cloud project.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [ ] Both keys exist with the restrictions above
- [ ] A `google_maps` text search run through Composio with the connection returns places
- [ ] The env vars are set locally and documented
- [ ] A budget alert is set on the Cloud project
