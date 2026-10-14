/**
 * The Machine module reads the computer Jarvis runs on: how busy its CPU is,
 * how much RAM is used, and its battery. The OS's raw text is parsed by the
 * pure functions here; reading it is a thin shell in `server.ts`.
 */

/** Cumulative CPU time across every core, in the OS's ticks. */
export type CpuTimes = { busy: number; total: number }

/**
 * The whole-machine `cpu` line of `/proc/stat`. Waiting on disk counts as
 * idle, as in top; guest time is already inside user time, so it's left out.
 */
export function parseCpuTimes(procStat: string): CpuTimes {
  const line = procStat.split("\n").find((row) => row.startsWith("cpu "))
  if (!line) throw new Error("No cpu line in /proc/stat")
  const [user, nice, system, idle, iowait, irq, softirq, steal] = line
    .trim()
    .split(/\s+/)
    .slice(1, 9)
    .map((field) => Number(field ?? 0))
  const idleTime = idle! + iowait!
  const busy = user! + nice! + system! + irq! + softirq! + steal!
  return { busy, total: busy + idleTime }
}

/** How busy the CPU was between two samples, 0–100. */
export function cpuPercent(before: CpuTimes, after: CpuTimes) {
  const total = after.total - before.total
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, ((after.busy - before.busy) / total) * 100))
}

export type Memory = { usedBytes: number; totalBytes: number }

/** One `Name:  123 kB` figure from `/proc/meminfo`, in bytes. */
function meminfoBytes(meminfo: string, name: string) {
  const match = meminfo.match(new RegExp(`^${name}:\\s+(\\d+) kB`, "m"))
  if (!match) throw new Error(`No ${name} in /proc/meminfo`)
  return Number(match[1]) * 1024
}

/**
 * Used is what the OS can't hand out: total minus available, which counts
 * reclaimable cache as free, so it matches system monitors.
 */
export function parseMemory(meminfo: string): Memory {
  const totalBytes = meminfoBytes(meminfo, "MemTotal")
  return {
    usedBytes: totalBytes - meminfoBytes(meminfo, "MemAvailable"),
    totalBytes,
  }
}

/** How the computer is doing right now. */
export type MachineReading = {
  /** Busy since the previous reading, 0–100. */
  cpu: { percent: number }
  memory: Memory
  /** ISO time it was read. */
  at: string
}

/** The OS readings the Machine module is built on; any of them may throw. */
export type MachineSources = {
  cpuTimes(): Promise<CpuTimes>
  memory(): Promise<Memory>
}

export type MachineDeps = {
  sources: MachineSources
  now: () => Date
  wait: (ms: number) => Promise<void>
}

/** The first reading's two CPU samples are this far apart. */
const FIRST_SAMPLE_GAP_MS = 250

/** Readings closer than this repeat the CPU %, as so few ticks would be noise. */
const MIN_CPU_WINDOW_MS = 500

export function createMachine({ sources, now, wait }: MachineDeps) {
  let previous: { times: CpuTimes; at: number; percent: number } | null = null

  async function readCpu() {
    if (previous && now().getTime() - previous.at < MIN_CPU_WINDOW_MS) {
      return previous.percent
    }
    let before = previous?.times
    if (!before) {
      before = await sources.cpuTimes()
      await wait(FIRST_SAMPLE_GAP_MS)
    }
    const times = await sources.cpuTimes()
    const percent = cpuPercent(before, times)
    previous = { times, at: now().getTime(), percent }
    return percent
  }

  return {
    /** Throws when the OS can't be read. */
    async read(): Promise<MachineReading> {
      const [percent, memory] = await Promise.all([readCpu(), sources.memory()])
      return { cpu: { percent }, memory, at: now().toISOString() }
    },
  }
}

export type Machine = ReturnType<typeof createMachine>
