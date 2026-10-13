# 02: Set up the Google Cloud OAuth client

**What to build:** The Owner's Google Cloud setup so that the Gmail Plugin can be installed against real Gmail: a project with the APIs from ticket 01 enabled, an OAuth consent screen with the Owner added as a test user, and an OAuth client whose redirect URI is the local OAuth callback. Its credentials go in the web app's local env file (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). Only the Owner can do this; it gates the real-Gmail manual checks of tickets 04–07, not their implementation.

**Blocked by:** 01 (Confirm Google's Gmail MCP server against official docs)

**Status:** ready-for-human

- [ ] The Google Cloud project (not only the Owner's account) is enrolled in the Google Workspace Developer Preview Program. Without it, every Gmail MCP tool call fails with "Access to this tool requires that your Google Cloud project (…) is enrolled in the Google Workspace Developer Preview Program"
- [x] Google Cloud project exists with the required APIs enabled
- [x] Consent screen configured with the Owner as test user and the scope from ticket 01
- [x] OAuth client created (type: Web application) with the local callback redirect URI `http://localhost:3000/api/plugins/callback`
- [x] Credentials present in the web app's local env file (not committed)
