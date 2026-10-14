# 02: Set up the Composio account and API key

**What to build:** The Owner's Composio setup so Plugins can be installed against real services: a Composio account and project, and an API key in the web app's local env file as `COMPOSIO_API_KEY`. Only the Owner can do this. It gates the real-Gmail manual checks of tickets 04–06, not their implementation.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [ ] Composio account and project created
- [ ] API key created and present in the web app's local env file (not committed)
- [ ] After ticket 07 lands: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` removed from that file
