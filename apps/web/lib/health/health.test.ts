import { describe, expect, it } from "vitest"

import { createHealth, ProbeError, type Probes } from "./health"

const MODELS = {
  chat: "deepseek-v4-flash",
  transcription: "whisper",
  speech: "kokoro",
}

const ENV = { NAN_API_KEY: "nan-key", COMPOSIO_API_KEY: "composio-key" }

type ProbeName = keyof Probes

/**
 * Probes that pass unless told otherwise, counting their calls, over a clock
 * the test moves by hand.
 */
function setup(
  options: {
    env?: Record<string, string | undefined>
    probes?: Partial<Probes>
    timeoutMs?: number
  } = {}
) {
  let at = Date.parse("2026-10-14T12:00:00Z")
  const calls: Record<ProbeName, number> = {
    nanModels: 0,
    database: 0,
    composio: 0,
    weather: 0,
  }
  const passing: Probes = {
    nanModels: async () => [MODELS.chat, MODELS.transcription, MODELS.speech],
    database: async () => {},
    composio: async () => {},
    weather: async () => {},
  }
  const probes = Object.fromEntries(
    (Object.keys(passing) as ProbeName[]).map((name) => [
      name,
      () => {
        calls[name]++
        return (options.probes?.[name] ?? passing[name])()
      },
    ])
  ) as Probes
  const health = createHealth({
    probes,
    env: options.env ?? ENV,
    models: MODELS,
    now: () => new Date(at),
    timeoutMs: options.timeoutMs ?? 1_000,
  })
  return { health, calls, advance: (ms: number) => void (at += ms) }
}

/** Each part's level, and its reason when failing, by id. */
function levels(
  report: Awaited<ReturnType<ReturnType<typeof setup>["health"]["current"]>>
) {
  return Object.fromEntries(
    report.parts.map(({ id, level, reason }) => [
      id,
      reason ? `${level}: ${reason}` : level,
    ])
  )
}

describe("Jarvis Health from probes", () => {
  it("is Working when every probe passes, listing each part in Spanish", async () => {
    const { health } = setup()

    const report = await health.current()

    expect(report.level).toBe("working")
    expect(report.parts.map(({ label, level }) => [label, level])).toEqual([
      ["Entender (transcripción)", "working"],
      ["Pensar (modelo)", "working"],
      ["Hablar (voz)", "working"],
      ["Memoria (base de datos)", "working"],
      ["Búsqueda y Plugins", "working"],
      ["Tiempo", "working"],
      ["Navegador", "working"],
    ])
    expect(report.checkedAt).toBe("2026-10-14T12:00:00.000Z")
  })

  it("is Limited when a part Jarvis can talk without fails", async () => {
    const { health } = setup({
      probes: {
        weather: async () => {
          throw new ProbeError("el servicio del tiempo no responde")
        },
      },
    })

    const report = await health.current()

    expect(report.level).toBe("limited")
    expect(levels(report).weather).toBe(
      "failing: el servicio del tiempo no responde"
    )
  })

  it("is Down when an essential part fails", async () => {
    const { health } = setup({
      probes: {
        database: async () => {
          throw new ProbeError("la base de datos no responde")
        },
      },
    })

    expect((await health.current()).level).toBe("down")
  })

  it("fails a part whose key is missing as «sin configurar», without probing it", async () => {
    const { health, calls } = setup({ env: { NAN_API_KEY: "nan-key" } })

    const report = await health.current()

    expect(levels(report)).toMatchObject({
      search: "failing: sin configurar",
      browse: "failing: sin configurar",
      thinking: "working",
    })
    expect(report.level).toBe("limited")
    expect(calls.composio).toBe(0)
  })

  it("is Down without the Nan key, never calling Nan", async () => {
    const { health, calls } = setup({ env: { COMPOSIO_API_KEY: "key" } })

    const report = await health.current()

    expect(report.level).toBe("down")
    expect(levels(report).understanding).toBe("failing: sin configurar")
    expect(calls.nanModels).toBe(0)
  })

  it("asks Nan for its model list once for understanding, thinking and speaking", async () => {
    const { health, calls } = setup({
      probes: { nanModels: async () => [MODELS.chat, MODELS.speech] },
    })

    const report = await health.current()

    expect(calls.nanModels).toBe(1)
    expect(levels(report)).toMatchObject({
      understanding: "failing: Nan no ofrece el modelo «whisper»",
      thinking: "working",
      speaking: "working",
    })
  })

  it("lets Browse follow Composio's probe", async () => {
    const { health, calls } = setup({
      probes: {
        composio: async () => {
          throw new ProbeError("la clave de Composio no es válida")
        },
      },
    })

    const report = await health.current()

    expect(calls.composio).toBe(1)
    expect(levels(report).browse).toBe(
      "failing: la clave de Composio no es válida"
    )
  })

  it("counts a probe that throws or hangs as failing, never as an error", async () => {
    const { health } = setup({
      timeoutMs: 20,
      probes: {
        composio: async () => {
          throw new Error("fetch failed")
        },
        weather: () => new Promise(() => {}),
      },
    })

    const report = await health.current()

    expect(levels(report)).toMatchObject({
      search: "failing: no responde",
      weather: "failing: no responde",
    })
  })

  it("says since when a part has been failing", async () => {
    const failing = {
      weather: async () => {
        throw new ProbeError("no responde")
      },
    }
    const { health, advance } = setup({ probes: failing })
    await health.current()
    advance(120_000)

    const report = await health.current({ recheck: true })

    const weather = report.parts.find(({ id }) => id === "weather")
    expect(weather?.since).toBe("2026-10-14T12:00:00.000Z")
    expect(report.checkedAt).toBe("2026-10-14T12:02:00.000Z")
  })
})

describe("How often Jarvis Health probes", () => {
  it("reuses the last probe run for about a minute", async () => {
    const { health, calls, advance } = setup()
    await health.current()

    advance(59_000)
    await health.current()
    expect(calls.database).toBe(1)

    advance(2_000)
    await health.current()
    expect(calls.database).toBe(2)
  })

  it("probes again straight away on a recheck", async () => {
    const { health, calls } = setup()
    await health.current()

    await health.current({ recheck: true })

    expect(calls.database).toBe(2)
  })

  it("shares one probe run between calls made at the same time", async () => {
    const { health, calls } = setup()

    const reports = await Promise.all([
      health.current(),
      health.current({ recheck: true }),
      health.current(),
    ])

    expect(calls.nanModels).toBe(1)
    expect(calls.database).toBe(1)
    expect(new Set(reports.map(({ level }) => level))).toEqual(
      new Set(["working"])
    )
  })
})
