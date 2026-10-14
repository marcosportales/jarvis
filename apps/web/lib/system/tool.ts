import { tool, type ToolSet } from "ai"
import { z } from "zod"

import type { Health, HealthReport } from "../health/health"
import type { Machine, MachineReading } from "../machine/machine"
import { formatMemory, formatPercent } from "./status"

const LEVEL_WORDS: Record<HealthReport["level"], string> = {
  working: "Funcionando",
  limited: "Limitado (Jarvis habla, pero alguna capacidad falla)",
  down: "Caído (no se puede mantener una conversación)",
}

function machineLines({ cpu, memory, battery }: MachineReading) {
  return [
    `CPU: ${formatPercent(cpu.percent)}.`,
    `RAM: ${formatMemory(memory)} usados.`,
    battery
      ? `Batería: ${formatPercent(battery.percent)}, ${battery.charging ? "está cargando" : "no está cargando"}.`
      : "Batería: este ordenador no tiene batería.",
  ]
}

function healthLines({ level, parts }: HealthReport) {
  const failing = parts.filter((part) => part.level === "failing")
  return [
    `Salud de Jarvis: ${LEVEL_WORDS[level]}.`,
    ...(failing.length > 0
      ? [
          "Partes que fallan:",
          ...failing.map(({ label, reason }) =>
            reason ? `- ${label}: ${reason}.` : `- ${label}.`
          ),
        ]
      : ["Todas sus partes funcionan."]),
  ]
}

/** Jarvis's tool for the computer and its own Health, for one Turn. */
export type SystemTurnTools = {
  tools: ToolSet
  /** `get_system_status` ran in this Turn. */
  used(): boolean
}

/**
 * Built in, like the weather: it reads the computer and Health's latest
 * report, without forcing probes, and answers plain lines. A failing read
 * becomes an answer for the model, never a thrown error, so the Turn goes on.
 */
export function createSystemTools({
  machine,
  health,
}: {
  machine: Pick<Machine, "read">
  health: Pick<Health, "current">
}): SystemTurnTools {
  let used = false

  async function machinePart() {
    try {
      return machineLines(await machine.read())
    } catch (error) {
      console.error("Reading the computer failed", error)
      return ["No he podido leer el ordenador ahora mismo."]
    }
  }

  async function healthPart() {
    try {
      return healthLines(await health.current())
    } catch (error) {
      console.error("Checking Jarvis Health failed", error)
      return ["No he podido comprobar la Salud de Jarvis ahora mismo."]
    }
  }

  return {
    tools: {
      get_system_status: tool({
        description:
          "Mira cómo va el ordenador donde corre Jarvis (uso de CPU, RAM usada del total y la batería, si tiene) y la Salud de Jarvis: si funciona, está limitado o caído, y qué parte falla y por qué.",
        inputSchema: z.object({}),
        execute: async () => {
          used = true
          const [computer, jarvis] = await Promise.all([
            machinePart(),
            healthPart(),
          ])
          return [
            "Ordenador:",
            ...computer,
            ...jarvis,
            "Responde solo a lo que preguntó el dueño; si algo no se pudo comprobar, dilo en una frase.",
          ].join("\n")
        },
      }),
    },
    used: () => used,
  }
}
