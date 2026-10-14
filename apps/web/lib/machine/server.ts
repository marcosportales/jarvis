import "server-only"

import { readdir, readFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { setTimeout as wait } from "node:timers/promises"

import {
  createMachine,
  parseBattery,
  parseCpuTimes,
  parseMemory,
  type CpuTimes,
  type Machine,
  type MachineSources,
} from "./machine"

const POWER_SUPPLY_DIR = "/sys/class/power_supply"

/** Every power supply's `uevent`; none at all on most desktops. */
async function powerSupplyUevents() {
  let names: string[]
  try {
    names = await readdir(POWER_SUPPLY_DIR)
  } catch {
    return []
  }
  return Promise.all(
    names.map((name) =>
      readFile(path.join(POWER_SUPPLY_DIR, name, "uevent"), "utf8").catch(
        () => ""
      )
    )
  )
}

/** Linux exposes everything as text under `/proc` and `/sys`. */
const linuxSources: MachineSources = {
  cpuTimes: async () => parseCpuTimes(await readFile("/proc/stat", "utf8")),
  memory: async () => parseMemory(await readFile("/proc/meminfo", "utf8")),
  battery: async () => parseBattery(await powerSupplyUevents()),
}

/**
 * Elsewhere, Node's own counters; free memory stands in for available, and
 * there's no battery reading yet.
 */
const nodeSources: MachineSources = {
  cpuTimes: async () =>
    os.cpus().reduce<CpuTimes>(
      (sum, { times }) => {
        const busy = times.user + times.nice + times.sys + times.irq
        return { busy: sum.busy + busy, total: sum.total + busy + times.idle }
      },
      { busy: 0, total: 0 }
    ),
  memory: async () => ({
    usedBytes: os.totalmem() - os.freemem(),
    totalBytes: os.totalmem(),
  }),
  battery: async () => null,
}

// One per module, so each reading measures the CPU since the one before. Not
// kept on globalThis: it only holds the last CPU sample, so a dev reload may
// start afresh with its new code.
let machine: Machine | undefined

/** The Machine module over the computer this server runs on. */
export function getMachine(): Machine {
  machine ??= createMachine({
    sources: process.platform === "linux" ? linuxSources : nodeSources,
    now: () => new Date(),
    wait: (ms) => wait(ms),
  })
  return machine
}
