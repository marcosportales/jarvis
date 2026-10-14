# 02: The System Widget shows the battery

**What to build:** On a computer with a battery, the System Widget adds a row with the battery % (with a bar) and whether it's charging. On a computer without one, the row isn't there at all. Read on Linux from the kernel's power-supply entries; other OSes report no battery for now.

See `../spec.md` (stories 3, 4; "Machine readings").

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Parser tests over recorded fixtures: charging, discharging, full, not charging, and no battery entry (`battery: null`)
- [ ] The route's reading includes the battery or `null`
- [ ] The Widget shows the row only when there is a battery, with a charging indicator
- [ ] In the running app on this laptop: the % matches the system's own indicator, and plugging in or unplugging flips the charging indicator within a few seconds
- [ ] Typecheck, lint and the full test suite pass
