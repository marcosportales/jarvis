import { generateText, stepCountIs, type LanguageModel, type ToolSet } from "ai"

import type { MemoryEvent } from "../memory/events"
import type { MemoryStore } from "../memory/store"
import { createMemoryTools, memoryNotice } from "../memory/tools"
import type { Plugins, TurnTools } from "../plugins/plugins"
import type { ResultsOnScreen, SearchOutcome } from "../search/outcome"
import type { SearchPort } from "../search/port"
import { createSearchTools, resultsOnScreenNotice } from "../search/tools"
import {
  UnknownSessionError,
  type SavedTurn,
  type SessionStore,
} from "../sessions/store"
import { createWeatherTools } from "../weather/tool"
import type { Coordinates, WeatherService } from "../weather/weather"
import { WIDGET_CATALOG } from "../widgets/catalog"
import type { WidgetChange, WidgetLayout } from "../widgets/changes"
import { createWidgetTools, widgetLayoutNotice } from "../widgets/tools"
import { JARVIS_SYSTEM_PROMPT } from "./system-prompt"

/** Bounds how many tool-use rounds a single Reply may take. */
export const MAX_REPLY_STEPS = 5

/** Spoken when the step limit ends the Reply before the model said anything. */
export const FALLBACK_REPLY =
  "Lo siento, no he podido terminar de consultarlo. ¿Me lo preguntas de otra forma?"

/** What the Owner said, with what the client knows at that moment. */
export type TurnRequest = {
  /** Left out to start a new Session. */
  sessionId?: string
  text: string
  widgets: WidgetLayout
  /** The Owner's coordinates, only when the browser already had permission. */
  coords?: Coordinates
  /** What the Results Widget shows, only while it is Shown. */
  results?: ResultsOnScreen
}

/** Jarvis's Reply, once the Turn is saved in `sessionId`. */
export type TurnReply = {
  sessionId: string
  text: string
  widgetChanges: WidgetChange[]
  memoryEvents: MemoryEvent[]
  /** The Turn's latest Search Outcome; absent if it didn't search. */
  search?: SearchOutcome
}

export type TurnsDeps = {
  model: LanguageModel
  sessions: SessionStore
  memories: MemoryStore
  plugins: Pick<Plugins, "toolsForTurn">
  weather: WeatherService
  search: SearchPort
  now: () => Date
}

/** The Results Widget's id in the Widget catalog. */
const RESULTS_WIDGET = "results"

/**
 * The Turn's Widget changes, plus Showing the Results Widget when its Search
 * found a list. A Turn rule, so it doesn't depend on the model remembering;
 * the model hiding, showing or moving that Widget itself wins.
 */
function withResultsShown(
  changes: WidgetChange[],
  outcome: SearchOutcome | undefined
): WidgetChange[] {
  if (!outcome || outcome.results.length <= 1) return changes
  if (changes.some(({ id }) => id === RESULTS_WIDGET)) return changes
  return [...changes, { type: "show", id: RESULTS_WIDGET }]
}

/** The earlier Turns as the chat model sees them. */
function toMessages(turns: SavedTurn[]) {
  return turns.flatMap(({ owner, reply }) => [
    { role: "user" as const, content: owner },
    { role: "assistant" as const, content: reply },
  ])
}

/** Lets the model resolve "hoy" or "esta semana" when searching a service. */
function currentDateLine(now: Date) {
  const formatted = now.toLocaleString("es-ES", {
    dateStyle: "full",
    timeStyle: "short",
  })
  return `Fecha y hora actuales: ${formatted}.`
}

/**
 * One tool set for the model, where Jarvis's own tools always win. A Plugin
 * tool whose name is taken is left out and logged; two built-in tools with
 * the same name are a programming mistake, so they throw. Exported only so
 * that last rule can be tested, as no Turn can trigger it today.
 */
export function mergeTools({
  builtIn,
  plugin,
}: {
  builtIn: ToolSet[]
  plugin: ToolSet
}): ToolSet {
  const merged: ToolSet = {}
  for (const tools of builtIn) {
    for (const [name, tool] of Object.entries(tools)) {
      if (name in merged) {
        throw new Error(`Two built-in tools are named "${name}"`)
      }
      merged[name] = tool
    }
  }
  for (const [name, tool] of Object.entries(plugin)) {
    if (name in merged) {
      console.error(
        `Left out the Plugin tool "${name}": a built-in tool has that name`
      )
      continue
    }
    merged[name] = tool
  }
  return merged
}

/** Jarvis's Turns over the given model and stores. */
export function createTurns({
  model,
  sessions,
  memories,
  plugins,
  weather,
  search,
  now,
}: TurnsDeps) {
  /** A Plugin problem must never fail the Turn, so fall back to no tools. */
  async function loadPluginTools(): Promise<TurnTools> {
    try {
      return await plugins.toolsForTurn()
    } catch (error) {
      console.error("Loading Plugin tools failed", error)
      return { tools: {}, notices: [], close: async () => {} }
    }
  }

  return {
    /**
     * Produces Jarvis's Reply and saves the Turn, only once the Reply is
     * ready. Throws `UnknownSessionError` if the Session doesn't exist, also
     * when it is deleted while Jarvis is Thinking.
     */
    async take({
      sessionId,
      text,
      widgets,
      coords,
      results,
    }: TurnRequest): Promise<TurnReply> {
      let earlier: SavedTurn[] = []
      if (sessionId) {
        const found = await sessions.recentTurns(sessionId)
        if (!found) throw new UnknownSessionError(sessionId)
        earlier = found
      }

      const memoryTools = createMemoryTools(memories, { sessionId })
      const pluginTools = await loadPluginTools()
      const widgetTools = createWidgetTools(WIDGET_CATALOG)
      const weatherTools = createWeatherTools({ weather, coords })
      const searchTools = createSearchTools({ search })
      try {
        const generated = await generateText({
          model,
          system: [
            JARVIS_SYSTEM_PROMPT,
            currentDateLine(now()),
            widgetLayoutNotice(widgets),
            resultsOnScreenNotice(results),
            await memoryNotice(memories),
            ...pluginTools.notices,
          ]
            .filter((part) => part !== null)
            .join("\n\n"),
          messages: [...toMessages(earlier), { role: "user", content: text }],
          tools: mergeTools({
            builtIn: [
              memoryTools.tools,
              widgetTools.tools,
              weatherTools,
              searchTools.tools,
            ],
            plugin: pluginTools.tools,
          }),
          stopWhen: stepCountIs(MAX_REPLY_STEPS),
        })

        const reply = generated.text.trim() || FALLBACK_REPLY

        // Saved only now that the Reply is ready, so a failed Turn saves nothing.
        const memoryEvents = memoryTools.events()
        const saved = { owner: text, reply, memoryEvents }
        let savedIn: string
        if (sessionId) {
          await sessions.addTurn(sessionId, saved)
          savedIn = sessionId
        } else {
          savedIn = await sessions.start(saved)
          await memoryTools.adoptSession(savedIn)
        }

        const outcome = searchTools.outcome()
        return {
          sessionId: savedIn,
          text: reply,
          widgetChanges: withResultsShown(widgetTools.changes(), outcome),
          memoryEvents,
          ...(outcome ? { search: outcome } : {}),
        }
      } finally {
        await pluginTools.close()
      }
    },
  }
}

export type Turns = ReturnType<typeof createTurns>
