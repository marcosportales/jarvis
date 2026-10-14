# 07: Remove the direct-Google path

**What to build:** With Install, Turns and Uninstall all going through Composio, remove everything left over from ADR 0001 (now replaced by ADR 0005):
- the Google OAuth client and the Google provider
- the token store, and the Plugins module's store and OAuth dependencies
- the token refresh, expiry and revocation tests
- reads of `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- the Installed Plugins and tokens tables, dropped by a migration so no Google tokens stay on disk

Add a short note to the Gmail Plugins spec saying its Connector design is replaced by the Composio spec.

**Blocked by:** 04, 05, 06

**Status:** ready-for-human (implemented; only the manual check against real Gmail remains, after ticket 02)

- [x] No code reads Google OAuth credentials or stores tokens
- [x] Migration drops the Installed Plugins and tokens tables, and runs cleanly on an existing database
- [x] Gmail Plugins spec points to the Composio spec
- [ ] Manual: `/plugins`, Install, a Gmail question and Uninstall still work end to end
- [x] Lint, typecheck and tests pass
