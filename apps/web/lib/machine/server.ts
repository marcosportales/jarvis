import "server-only"

import { readFile } from "node:fs/promises"
import os from "node:os"
import { setTimeout as wait } from "node:timers/promises"

import {
  createMachine,
  parseCpuTimes,
  parseMemory,
  type CpuTimes,
  type Machine,
  type MachineSources,
} from "./machine"

/** Linux exposes everything as text under `/proc`. */
const linuxSources: MachineSources = {
  cpuTimes: async () => parseCpuTimes(await readFile("/proc/stat", "utf8")),
  memory: async () => parseMemory(await readFile("/proc/meminfo", "utf8")),
}

/** Elsewhere, Node's own counters; free memory stands in for available. */
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
}

// One per server, so each reading measures the CPU since the one before.
const globalForMachine = globalThis as { jarvisMachine?: Machine }

/** The Machine module over the computer this server runs on. */
export function getMachine(): Machine {
  globalForMachine.jarvisMachine ??= createMachine({
    sources: process.platform === "linux" ? linuxSources : nodeSources,
    now: () => new Date(),
    wait: (ms) => wait(ms),
  })
  return globalForMachine.jarvisMachine
}
