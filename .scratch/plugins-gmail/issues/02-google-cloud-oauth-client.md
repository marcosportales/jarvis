# 02: Set up the Google Cloud OAuth client

**What to build:** The Owner's Google Cloud setup so that the Gmail Plugin can be installed against real Gmail: a project with the APIs from ticket 01 enabled, an OAuth consent screen with the Owner added as a test user, and an OAuth client whose redirect URI is the local OAuth callback. Its credentials go in the web app's local env file (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). Only the Owner can do this; it gates the real-Gmail manual checks of tickets 04–07, not their implementation.

**Blocked by:** 01 (Confirm Google's Gmail MCP server against official docs)

**Status:** ready-for-human

- [ ] Owner enrolled in the Google Workspace Developer Preview Program (required by the Gmail MCP server, see ticket 01)
- [ ] Google Cloud project exists with the required APIs enabled
- [ ] Consent screen configured with the Owner as test user and the scope from ticket 01
- [ ] OAuth client created (type: Web application) with the local callback redirect URI `http://localhost:3000/api/plugins/callback`
- [ ] Credentials present in the web app's local env file (not committed)
