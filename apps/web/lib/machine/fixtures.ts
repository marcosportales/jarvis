/**
 * Raw OS text recorded on 2026-10-14 from the Owner's Arch laptop (8 cores,
 * 16 GB, one battery), for the Machine parsers. The other battery statuses
 * are that recording with its status and capacity swapped, and the mouse is
 * modelled on the kernel's HID battery entries, as no desktop was at hand.
 */

/** `/proc/stat`'s whole-machine line, one second apart while mostly idle. */
export const PROC_STAT_BEFORE = `cpu  10475575 1304683 2567193 147775401 40832141 1320258 438395 0 0 0
`

export const PROC_STAT_AFTER = `cpu  10475589 1304687 2567197 147775971 40832345 1320262 438396 0 0 0
`

/** `/proc/meminfo`, the first lines: lots of cache, so free is far below available. */
export const PROC_MEMINFO = `MemTotal:       16090128 kB
MemFree:         2843616 kB
MemAvailable:    9130412 kB
Buffers:          654468 kB
Cached:          6001068 kB
SwapCached:            0 kB
`

/** `/sys/class/power_supply/BAT0/uevent` on the laptop, unplugged. */
export const BATTERY_DISCHARGING = `DEVTYPE=power_supply
POWER_SUPPLY_NAME=BAT0
POWER_SUPPLY_TYPE=Battery
POWER_SUPPLY_STATUS=Discharging
POWER_SUPPLY_HEALTH=Good
POWER_SUPPLY_PRESENT=1
POWER_SUPPLY_TECHNOLOGY=Li-poly
POWER_SUPPLY_CYCLE_COUNT=0
POWER_SUPPLY_VOLTAGE_MIN_DESIGN=7600000
POWER_SUPPLY_VOLTAGE_NOW=7973000
POWER_SUPPLY_CURRENT_NOW=1599000
POWER_SUPPLY_CHARGE_FULL_DESIGN=6842000
POWER_SUPPLY_CHARGE_FULL=4440000
POWER_SUPPLY_CHARGE_NOW=4404000
POWER_SUPPLY_CAPACITY=99
POWER_SUPPLY_CAPACITY_LEVEL=Normal
POWER_SUPPLY_TEMP=380
POWER_SUPPLY_TYPE=Battery
POWER_SUPPLY_MODEL_NAME=DELL G8VCF6C
POWER_SUPPLY_MANUFACTURER=SMP
`

/** The same battery plugged in. */
export const BATTERY_CHARGING = BATTERY_DISCHARGING.replace(
  "STATUS=Discharging",
  "STATUS=Charging"
).replace("CAPACITY=99", "CAPACITY=64")

export const BATTERY_FULL = BATTERY_DISCHARGING.replace(
  "STATUS=Discharging",
  "STATUS=Full"
).replace("CAPACITY=99", "CAPACITY=100")

/** Plugged in, but held below full by the firmware's charge limit. */
export const BATTERY_NOT_CHARGING = BATTERY_DISCHARGING.replace(
  "STATUS=Discharging",
  "STATUS=Not charging"
).replace("CAPACITY=99", "CAPACITY=80")

/** The laptop's mains adapter, unplugged. */
export const AC_ADAPTER = `DEVTYPE=power_supply
POWER_SUPPLY_NAME=AC
POWER_SUPPLY_TYPE=Mains
POWER_SUPPLY_ONLINE=0
POWER_SUPPLY_TYPE=Mains
`

/** One of the laptop's USB-C ports, charging it: not a battery. */
export const USB_C_PORT = `DEVTYPE=power_supply
POWER_SUPPLY_NAME=ucsi-source-psy-USBC000:003
POWER_SUPPLY_TYPE=USB
POWER_SUPPLY_STATUS=Charging
POWER_SUPPLY_CHARGE_TYPE=Standard
POWER_SUPPLY_ONLINE=1
POWER_SUPPLY_TYPE=USB
POWER_SUPPLY_USB_TYPE=C [PD] PD_PPS
POWER_SUPPLY_SCOPE=System
`

/** A wireless mouse's battery on the desktop: the mouse's, not the computer's. */
export const MOUSE_BATTERY = `DEVTYPE=power_supply
POWER_SUPPLY_NAME=hidpp_battery_0
POWER_SUPPLY_TYPE=Battery
POWER_SUPPLY_SCOPE=Device
POWER_SUPPLY_STATUS=Discharging
POWER_SUPPLY_ONLINE=1
POWER_SUPPLY_CAPACITY=40
POWER_SUPPLY_MODEL_NAME=MX Master 3
`
