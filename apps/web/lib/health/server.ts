import "server-only"

import { Composio } from "@composio/core"
import { sql } from "drizzle-orm"
import { z } from "zod"

import { getDatabase } from "../db/server"
import { nanConfig } from "../jarvis/server/nan"
import { OWNER_USER_ID } from "../plugins/composio"
import { createWeather } from "../weather/weather"
import { createHealth, ProbeError, type Health, type Probes } from "./health"

const NAN_MODELS_URL = "https://api.nan.builders/v1/models"

/** Each probe gives up a little before Health counts it as not answering. */
const PROBE_TIMEOUT_MS = 5_000

const nanModelsSchema = z.object({
  data: z.array(z.object({ id: z.string() })),
})

/** A rejected key reads differently from a service that's down. */
function httpReason(status: number) {
  return status === 401 || status === 403
    ? "la clave no es válida"
    : `responde con error ${status}`
}

/** Composio's SDK errors carry the HTTP status on `status` or `statusCode`. */
function composioReason(error: unknown) {
  const status =
    error && typeof error === "object"
      ? ((error as { status?: unknown }).status ??
        (error as { statusCode?: unknown }).statusCode)
      : undefined
  return typeof status === "number" ? httpReason(status) : "no responde"
}

/**
 * The real, free probes: Nan's model list, `SELECT 1`, listing the Owner's
 * connected accounts (one), and the weather for the fallback city. None
 * generates text or speech.
 */
function realProbes(env: NodeJS.ProcessEnv): Probes {
  return {
    async nanModels() {
      const response = await fetch(NAN_MODELS_URL, {
        headers: { Authorization: `Bearer ${env.NAN_API_KEY}` },
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      })
      if (!response.ok) throw new ProbeError(httpReason(response.status))
      const parsed = nanModelsSchema.safeParse(await response.json())
      if (!parsed.success) throw new ProbeError("responde algo inesperado")
      return parsed.data.data.map(({ id }) => id)
    },
    async database() {
      try {
        getDatabase().get(sql`SELECT 1`)
      } catch (error) {
        console.error("Health: the database probe failed", error)
        throw new ProbeError("no se puede leer")
      }
    },
    async composio() {
      try {
        await new Composio({
          apiKey: env.COMPOSIO_API_KEY,
        }).connectedAccounts.list(
          { userIds: [OWNER_USER_ID], limit: 1 },
          { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) }
        )
      } catch (error) {
        console.error("Health: the Composio probe failed", error)
        throw new ProbeError(composioReason(error))
      }
    },
    async weather() {
      const result = await createWeather({ fetch, env }).forPlace({})
      if (result.status === "not-found") {
        throw new ProbeError(`no encuentra la ciudad «${result.place}»`)
      }
      if (result.status === "failed") throw new ProbeError("no responde")
    },
  }
}

// One per server, so a part that failed in a Turn shows on the System Widget.
const globalForHealth = globalThis as { jarvisHealth?: Health }

/** Jarvis Health over the real probes, env and Nan models. */
export function getHealth(): Health {
  globalForHealth.jarvisHealth ??= createHealth({
    probes: realProbes(process.env),
    env: process.env,
    models: {
      chat: nanConfig.chatModel,
      transcription: nanConfig.transcriptionModel,
      speech: nanConfig.speechModel,
    },
    now: () => new Date(),
    timeoutMs: PROBE_TIMEOUT_MS + 1_000,
  })
  return globalForHealth.jarvisHealth
}
