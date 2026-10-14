/**
 * Jarvis Health: whether Jarvis's own parts work, overall and for each part.
 * Free probes check them now and then, only when someone asks; never a paid
 * model or speech call.
 */

export type Env = Record<string, string | undefined>

/**
 * The free checks behind every part. Each throws when it fails, a
 * `ProbeError` when it can say why in Spanish.
 */
export type Probes = {
  /** The model IDs Nan offers, from its model list. */
  nanModels(): Promise<string[]>
  /** A trivial query on the local database. */
  database(): Promise<void>
  /** A cheap authenticated Composio call. */
  composio(): Promise<void>
  /** The weather service answers for the fallback city. */
  weather(): Promise<void>
}

/** A probe failure with a one-line Spanish reason for the Owner. */
export class ProbeError extends Error {}

/** The Nan models Jarvis is configured to use. */
export type NanModels = { chat: string; transcription: string; speech: string }

type ProbeRun = { [name in keyof Probes]: Probes[name] }

type PartDefinition = {
  id: string
  /** Spanish, shown to the Owner. */
  label: string
  /** Down when it fails, rather than Limited. */
  essential: boolean
  /** Env vars it can't work without; missing, it fails without probing. */
  needs: string[]
  /** Throws when the part fails; `run` calls each probe at most once. */
  check(run: ProbeRun, models: NanModels): Promise<void>
}

/** The model must be in Nan's list. */
function offers(id: keyof NanModels) {
  return async (run: ProbeRun, models: NanModels) => {
    const offered = await run.nanModels()
    if (!offered.includes(models[id])) {
      throw new ProbeError(`Nan no ofrece el modelo «${models[id]}»`)
    }
  }
}

/** Every part of Jarvis; adding one is one entry here. */
const PARTS: PartDefinition[] = [
  {
    id: "understanding",
    label: "Entender (transcripción)",
    essential: true,
    needs: ["NAN_API_KEY"],
    check: offers("transcription"),
  },
  {
    id: "thinking",
    label: "Pensar (modelo)",
    essential: true,
    needs: ["NAN_API_KEY"],
    check: offers("chat"),
  },
  {
    id: "speaking",
    label: "Hablar (voz)",
    essential: true,
    needs: ["NAN_API_KEY"],
    check: offers("speech"),
  },
  {
    id: "remembering",
    label: "Memoria (base de datos)",
    essential: true,
    needs: [],
    check: (run) => run.database(),
  },
  {
    id: "search",
    label: "Búsqueda y Plugins",
    essential: false,
    needs: ["COMPOSIO_API_KEY"],
    check: (run) => run.composio(),
  },
  {
    id: "weather",
    label: "Tiempo",
    essential: false,
    needs: [],
    check: (run) => run.weather(),
  },
  {
    // No probe of its own: Browse runs on Composio.
    id: "browse",
    label: "Navegador",
    essential: false,
    needs: ["COMPOSIO_API_KEY"],
    check: (run) => run.composio(),
  },
]

export type PartId = (typeof PARTS)[number]["id"]

export type PartHealth = {
  id: string
  label: string
  level: "working" | "failing"
  /** Why it fails, one Spanish line; only when failing. */
  reason?: string
  /** ISO time it started failing; only when failing. */
  since?: string
}

export type HealthReport = {
  level: "working" | "limited" | "down"
  parts: PartHealth[]
  /** ISO time the probes last ran. */
  checkedAt: string
}

export type HealthDeps = {
  probes: Probes
  env: Env
  models: NanModels
  now: () => Date
  /** A probe taking longer than this fails as not answering. */
  timeoutMs: number
}

/** Probes re-run when their last run is this old. */
const PROBE_INTERVAL_MS = 60_000

/** What a part's latest information says. */
type PartState = { failing: string | null; since: number | null; at: number }

export function createHealth({
  probes,
  env,
  models,
  now,
  timeoutMs,
}: HealthDeps) {
  const states = new Map<string, PartState>()
  /** When the probes last ran; null before the first run. */
  let checkedAt: number | null = null
  /** The probe run under way, which every caller meanwhile shares. */
  let running: Promise<void> | null = null

  /** Each probe once per run, however many parts share it. */
  function startRun(): ProbeRun {
    const started = new Map<keyof Probes, Promise<unknown>>()
    const once =
      <Name extends keyof Probes>(name: Name) =>
      () => {
        if (!started.has(name)) started.set(name, probes[name]())
        return started.get(name) as ReturnType<Probes[Name]>
      }
    return {
      nanModels: once("nanModels"),
      database: once("database"),
      composio: once("composio"),
      weather: once("weather"),
    }
  }

  /** Why the part fails, or null when it works. Never throws. */
  async function checkPart(part: PartDefinition, run: ProbeRun) {
    if (part.needs.some((name) => !env[name]?.trim())) return "sin configurar"
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        part.check(run, models),
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new ProbeError("no responde")),
            timeoutMs
          )
        }),
      ])
      return null
    } catch (error) {
      return error instanceof ProbeError ? error.message : "no responde"
    } finally {
      clearTimeout(timer)
    }
  }

  /** A part's newest information wins over what came before it. */
  function record(id: string, failing: string | null, at: number) {
    const previous = states.get(id)
    if (previous && previous.at > at) return
    states.set(id, {
      failing,
      since: failing ? (previous?.failing ? previous.since : at) : null,
      at,
    })
  }

  async function runProbes() {
    const startedAt = now().getTime()
    const run = startRun()
    const results = await Promise.all(PARTS.map((part) => checkPart(part, run)))
    PARTS.forEach((part, i) => record(part.id, results[i]!, startedAt))
    checkedAt = startedAt
  }

  function report(): HealthReport {
    const parts = PARTS.map(({ id, label }): PartHealth => {
      const state = states.get(id)
      if (!state?.failing) return { id, label, level: "working" }
      return {
        id,
        label,
        level: "failing",
        reason: state.failing,
        ...(state.since !== null
          ? { since: new Date(state.since).toISOString() }
          : {}),
      }
    })
    const failing = (essential: boolean) =>
      PARTS.some(
        (part, i) =>
          part.essential === essential && parts[i]!.level === "failing"
      )
    return {
      level: failing(true) ? "down" : failing(false) ? "limited" : "working",
      parts,
      checkedAt: new Date(checkedAt ?? now().getTime()).toISOString(),
    }
  }

  /** The probes are stale after a minute, or always on a recheck. */
  function probesDue(recheck: boolean) {
    return (
      recheck ||
      checkedAt === null ||
      now().getTime() - checkedAt >= PROBE_INTERVAL_MS
    )
  }

  return {
    /**
     * The latest Health. Probes first when the last run is a minute old, or
     * on `recheck`; calls made meanwhile share that one run. There is no
     * timer: nothing is probed unless someone asks.
     */
    async current({ recheck = false } = {}): Promise<HealthReport> {
      if (!running && probesDue(recheck)) {
        running = runProbes().finally(() => {
          running = null
        })
      }
      if (running) await running
      return report()
    },
  }
}

export type Health = ReturnType<typeof createHealth>
