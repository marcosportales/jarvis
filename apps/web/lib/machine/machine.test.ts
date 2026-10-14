import { describe, expect, it } from "vitest"

import {
  AC_ADAPTER,
  BATTERY_CHARGING,
  BATTERY_DISCHARGING,
  BATTERY_FULL,
  BATTERY_NOT_CHARGING,
  MOUSE_BATTERY,
  PROC_MEMINFO,
  PROC_STAT_AFTER,
  PROC_STAT_BEFORE,
  USB_C_PORT,
} from "./fixtures"
import {
  cpuPercent,
  createMachine,
  parseCpuTimes,
  parseBattery,
  parseMemory,
  type CpuTimes,
  type MachineSources,
} from "./machine"

/** Sources serving `samples` in turn, with a clock moved by `wait`. */
function fakeMachine(samples: CpuTimes[]) {
  let at = Date.parse("2026-10-14T12:00:00Z")
  const waits: number[] = []
  const queue = [...samples]
  const sources: MachineSources = {
    cpuTimes: async () => queue.shift() ?? samples.at(-1)!,
    memory: async () => parseMemory(PROC_MEMINFO),
    battery: async () => parseBattery([BATTERY_CHARGING]),
  }
  const machine = createMachine({
    sources,
    now: () => new Date(at),
    wait: async (ms) => {
      waits.push(ms)
      at += ms
    },
  })
  return {
    machine,
    waits,
    /** Lets time pass between readings. */
    advance: (ms: number) => void (at += ms),
  }
}

describe("Reading the CPU", () => {
  it("gives the whole machine's busy % between two counter samples", () => {
    const percent = cpuPercent(
      parseCpuTimes(PROC_STAT_BEFORE),
      parseCpuTimes(PROC_STAT_AFTER)
    )

    // 27 busy ticks out of 801; waiting on disk counts as idle, as in top.
    expect(percent).toBeCloseTo(3.37, 2)
  })
})

describe("Reading the RAM", () => {
  it("counts what the OS can't hand out as used: total minus available, not free", () => {
    expect(parseMemory(PROC_MEMINFO)).toEqual({
      // (16 090 128 − 9 130 412) kB, as system monitors show it.
      usedBytes: 6_959_716 * 1024,
      totalBytes: 16_090_128 * 1024,
    })
  })
})

describe("Reading the battery", () => {
  it.each([
    ["discharging", BATTERY_DISCHARGING, { percent: 99, charging: false }],
    ["charging", BATTERY_CHARGING, { percent: 64, charging: true }],
    ["full", BATTERY_FULL, { percent: 100, charging: false }],
    ["not charging", BATTERY_NOT_CHARGING, { percent: 80, charging: false }],
  ])("reads a %s battery", (_, uevent, expected) => {
    expect(parseBattery([AC_ADAPTER, uevent, USB_C_PORT])).toEqual(expected)
  })

  it("finds no battery on a computer without one, even with a charging USB port", () => {
    expect(parseBattery([AC_ADAPTER, USB_C_PORT])).toBeNull()
    expect(parseBattery([])).toBeNull()
  })

  it("doesn't count a wireless mouse's battery as the computer's", () => {
    expect(parseBattery([MOUSE_BATTERY])).toBeNull()
  })
})

describe("Reading the computer", () => {
  it("never gives a blank CPU on the first reading: it samples twice, a moment apart", async () => {
    const { machine, waits } = fakeMachine([
      parseCpuTimes(PROC_STAT_BEFORE),
      parseCpuTimes(PROC_STAT_AFTER),
    ])

    const reading = await machine.read()

    expect(reading.cpu.percent).toBeCloseTo(3.37, 2)
    expect(waits).toHaveLength(1)
    expect(reading.memory.totalBytes).toBe(16_090_128 * 1024)
    expect(reading.battery).toEqual({ percent: 64, charging: true })
    expect(reading.at).toBe("2026-10-14T12:00:00.250Z")
  })

  it("measures the CPU since the previous reading after that", async () => {
    const { machine, waits, advance } = fakeMachine([
      { busy: 0, total: 100 },
      { busy: 10, total: 200 },
      { busy: 60, total: 300 },
    ])
    await machine.read()
    advance(2_000)

    const reading = await machine.read()

    expect(reading.cpu.percent).toBe(50)
    expect(waits).toHaveLength(1)
  })

  it("repeats the last CPU % when read again straight away, rather than a noisy one", async () => {
    const { machine } = fakeMachine([
      { busy: 0, total: 100 },
      { busy: 10, total: 200 },
      { busy: 11, total: 201 },
    ])
    await machine.read()

    expect((await machine.read()).cpu.percent).toBe(10)
  })
})
