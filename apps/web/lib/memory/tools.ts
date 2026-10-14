import { tool, type ToolSet } from "ai"
import { z } from "zod"

import type { MemoryEvent } from "./events"
import type { Memory, MemoryStore } from "./store"

/** How much of the system prompt the core Memories may take. */
export const CORE_BUDGET_TOKENS = 1500

/** How many Memories one recall gives back. */
export const RECALL_LIMIT = 5

/** A rough token estimate, good enough to keep the prompt bounded. */
const CHARS_PER_TOKEN = 4

/** Jarvis's Memory tools for one Turn, and what they did to its Memory. */
export type MemoryTurnTools = {
  tools: ToolSet
  /** In the order the tools were called. */
  events(): MemoryEvent[]
  /** Points this Turn's Memories at the Session it was saved in. */
  adoptSession(sessionId: string): Promise<void>
}

const topicKey = z
  .string()
  .min(1)
  .describe(
    "Clave corta y estable del tema, en minúsculas y con guiones, p. ej. «hermana» o «trabajo». Reutiliza la de una memoria existente para sustituirla."
  )

/**
 * Each successful call records a Memory event for the Reply. A failure becomes
 * an answer for the model, never a failed Turn.
 */
export function createMemoryTools(
  memories: MemoryStore,
  { sessionId }: { sessionId?: string } = {}
): MemoryTurnTools {
  const events: MemoryEvent[] = []
  const remembered = new Set<string>()

  return {
    tools: {
      remember: tool({
        description:
          "Guarda una memoria duradera sobre el dueño. Si ya hay una con la misma clave, la sustituye.",
        inputSchema: z.object({
          topicKey,
          title: z
            .string()
            .min(1)
            .describe("Título breve, p. ej. «Su hermana»."),
          content: z
            .string()
            .min(1)
            .describe(
              "El hecho en tercera persona, en una o dos frases, p. ej. «La hermana del dueño se llama Lucía.»."
            ),
        }),
        execute: async ({ topicKey, title, content }) => {
          try {
            await memories.remember({
              topicKey,
              title,
              content,
              sourceSessionId: sessionId,
            })
          } catch (error) {
            console.error("Remembering failed", error)
            return "No pude guardar la memoria."
          }
          remembered.add(topicKey)
          events.push({ kind: "remembered", title })
          return `Memoria «${title}» guardada.`
        },
      }),
      forget: tool({
        description:
          "Borra una memoria sobre el dueño por su clave. Usa la clave tal como aparece en tus memorias.",
        inputSchema: z.object({ topicKey }),
        execute: async ({ topicKey }) => {
          let forgotten
          try {
            forgotten = await memories.forget(topicKey)
          } catch (error) {
            console.error("Forgetting failed", error)
            return "No pude borrar la memoria."
          }
          if (!forgotten) {
            return `No hay ninguna memoria con la clave «${topicKey}»; no se ha borrado nada.`
          }
          events.push({ kind: "forgotten", title: forgotten.title })
          return `Memoria «${forgotten.title}» borrada.`
        },
      }),
      recall: tool({
        description:
          "Busca entre todas tus memorias sobre el dueño, también las que no aparecen en tus instrucciones. Devuelve las que coinciden, con su clave.",
        inputSchema: z.object({
          query: z
            .string()
            .describe(
              "Palabras de lo que buscas, p. ej. «hermana» o «trabajo empresa»."
            ),
        }),
        execute: async ({ query }) => {
          let found
          try {
            found = await memories.search(query, RECALL_LIMIT)
          } catch (error) {
            console.error("Recalling failed", error)
            return "No pude buscar en las memorias."
          }
          if (found.length === 0) {
            return `No hay ninguna memoria que coincida con «${query}».`
          }
          return `Memorias encontradas:\n${found.map(memoryLine).join("\n")}`
        },
      }),
    },
    events: () => [...events],
    async adoptSession(id) {
      if (sessionId) return
      // The Turn is already saved; a missing link must not fail it.
      await memories.setSource([...remembered], id).catch((error: unknown) => {
        console.error("Linking Memories to their Session failed", error)
      })
    },
  }
}

function memoryLine({ topicKey, title, content }: Memory) {
  return `- [${topicKey}] ${title}: ${content}`
}

/**
 * The core Memories for the system prompt: newest-updated first, each with its
 * topic key so Jarvis can replace it, cut at the token budget.
 */
export async function memoryNotice(memories: MemoryStore) {
  const all = await memories.all()
  if (all.length === 0) {
    return "No tienes ninguna memoria del dueño todavía."
  }
  const heading =
    "Memorias del dueño (entre corchetes, la clave de cada una; úsala para sustituirla):"
  const budget = CORE_BUDGET_TOKENS * CHARS_PER_TOKEN
  const more =
    "Tienes más memorias guardadas que no caben aquí; búscalas con recall cuando te pregunten por algo que no está en esta lista."
  const lines: string[] = []
  // The note about more Memories is budgeted up front, in case it's needed.
  let used = heading.length + more.length + 2
  for (const memory of all) {
    const line = memoryLine(memory)
    used += line.length + 1
    if (used > budget) break
    lines.push(line)
  }
  const cut = lines.length < all.length
  return [heading, ...lines, ...(cut ? [more] : [])].join("\n")
}
