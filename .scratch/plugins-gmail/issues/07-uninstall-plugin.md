# 07: Uninstall a Plugin

**What to build:** On `/plugins`, the Owner can Uninstall an Installed Plugin. Its tokens and Installed record are deleted, and the token is revoked with the provider when possible (a failed revocation doesn't block uninstalling). Afterwards the Plugin shows as installable again and Jarvis no longer has its tools. Adds *uninstall* to the Plugins module.

**Blocked by:** 04 (Install Gmail through OAuth, so it's Connected)

**Status:** ready-for-agent

- [ ] Uninstall deletes tokens and the Installed record; Plugin shows installable again
- [ ] Revocation is attempted with the provider; failure to revoke still completes the uninstall
- [ ] Tools for a Turn no longer include the Plugin's tools (if ticket 05 has landed)
- [ ] Plugins module tests with a fake OAuth provider cover uninstall with successful and failing revocation
- [ ] Manual (needs ticket 02): after Uninstall, asking about email gets "no tengo acceso a tu Gmail" or equivalent
