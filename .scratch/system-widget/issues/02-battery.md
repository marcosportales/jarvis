# 02: The System Widget shows the battery

**What to build:** On a computer with a battery, the System Widget adds a row with the battery % (with a bar) and whether it's charging. On a computer without one, the row isn't there at all. Read on Linux from the kernel's power-supply entries; other OSes report no battery for now.

See `../spec.md` (stories 3, 4; "Machine readings").

**Blocked by:** 01

**Status:** done

- [x] Parser tests over recorded fixtures: charging, discharging, full, not charging, and no battery entry (`battery: null`)
- [x] The route's reading includes the battery or `null`
- [x] The Widget shows the row only when there is a battery, with a charging indicator
- [ ] In the running app on this laptop: the % matches the system's own indicator, and plugging in or unplugging flips the charging indicator within a few seconds
- [x] Typecheck, lint and the full test suite pass

## Comments

Done on 2026-10-14. Checked in the running app on this laptop: the Widget and `GET /api/system` showed "Batería 92 %", not charging, the same as `upower` (92 %, discharging) and `/sys/class/power_supply/BAT0`.

Not checked: plugging in and unplugging, as nobody was at the laptop. The charging case is covered by the parser tests, and the Widget reads afresh every 2 s.

Notes:

- Only `TYPE=Battery` entries count. This laptop's USB-C ports report `STATUS=Charging` but are `TYPE=USB`, and a wireless mouse's battery has `SCOPE=Device`; neither is the computer's battery.
- With several batteries, the Widget shows their average charge, charging if any is.
- The Machine instance now lives at module level, not on `globalThis`. It only holds the last CPU sample, and on `globalThis` a dev reload kept the old instance without the battery source.
