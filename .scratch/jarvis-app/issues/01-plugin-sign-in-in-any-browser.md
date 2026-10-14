# 01: A Plugin sign-in can finish in a different browser from the one that started it

**What to build:** Installing or reconnecting a Plugin keeps working when the consent screen finishes in a different browser from the one that started it. The Jarvis App needs this: Google refuses sign-in inside an app window, so the Jarvis App sends the sign-in to the Owner's own browser.
- The Plugins module keeps each pending install itself (Plugin, OAuth state, connected account), keyed by its random state, for 10 minutes.
- Completing an install takes the callback's state and status, finds the pending install, and uses it once.
- An unknown, already used or expired state fails the way a mismatched state fails today.
- No cookie is set or read anymore.
- Pending installs live in memory, not the database. A restart in the middle of a sign-in means signing in again.
- The Marketplace page refreshes its Plugin list when its window regains focus or visibility, so a Plugin Connected in another browser shows up without a reload.

Nothing changes for the Owner in a browser tab.

See `../spec.md` (stories 44–48; "Plugins: a pending install no longer lives in a cookie").

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Plugins tests, with fixtures:
  - begin then complete by state → Connected
  - unknown state fails
  - a second complete with the same state fails
  - a state older than 10 minutes fails
- [x] The install action and the callback route no longer touch any cookie
- [ ] In the running app (browser tab): installing a Plugin still ends Connected on the Marketplace
- [ ] In the running app: start an install in one browser, then open the authorization URL in another browser profile → the Plugin ends Connected, and the first tab shows it after regaining focus
- [x] Typecheck, lint and the full test suite pass
