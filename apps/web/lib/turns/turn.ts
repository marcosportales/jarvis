import { generateText, stepCountIs, type LanguageModel, type ToolSet } from "ai"

import type { Browse } from "../browse/browse"
import { browseNotice, createBrowseTools } from "../browse/tools"
import type { MemoryEvent } from "../memory/events"
import type { MemoryStore } from "../memory/store"
import { createMemoryTools, memoryNotice } from "../memory/tools"
import type { Plugins, TurnTools } from "../plugins/plugins"
import {
  isList,
  type ResultsOnScreen,
  type SearchOutcome,
} from "../search/outcome"
import type { SearchPort } from "../search/port"
import { createSearchTools, resultsOnScreenNotice } from "../search/tools"
import {
  UnknownSessionError,
  type SavedTurn,
  type SessionStore,
} from "../sessions/store"
import { createWeatherTools } from "../weather/tool"
import type { Coordinates, WeatherService } from "../weather/weather"
import { RESULTS_WIDGET_ID, WIDGET_CATALOG } from "../widgets/catalog"
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
  browse: Browse
  now: () => Date
}

/**
 * What the Reply does to the Results Widget. A list Search replaces what it
 * shows, and Shows it when there is more than one Result; a Turn rule, so it
 * doesn't depend on the model remembering. The sources behind one answer (a
 * web Search, a page) leave it as it is, unless the model Shows or moves it.
 * The model hiding, showing or moving that Widget itself always wins.
 */
function resultsForReply(
  changes: WidgetChange[],
  outcome: SearchOutcome | undefined
): { widgetChanges: WidgetChange[]; search?: SearchOutcome } {
  const touched = changes.filter(({ id }) => id === RESULTS_WIDGET_ID)
  if (!outcome) return { widgetChanges: changes }
  if (!isList(outcome)) {
    const shownByModel = touched.some(({ type }) => type !== "hide")
    return shownByModel
      ? { widgetChanges: changes, search: outcome }
      : { widgetChanges: changes }
  }
  if (outcome.results.length <= 1 || touched.length > 0) {
    return { widgetChanges: changes, search: outcome }
  }
  return {
    widgetChanges: [...changes, { type: "show", id: RESULTS_WIDGET_ID }],
    search: outcome,
  }
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
  browse,
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

  /** A Browse problem must never fail the Turn, so leave the notice out. */
  async function loadBrowseNotice() {
    try {
      return browseNotice(await browse.current(), now())
    } catch (error) {
      console.error("Loading the Browse Task failed", error)
      return null
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
      const browseTools = createBrowseTools({ browse })
      try {
        const generated = await generateText({
          model,
          system: [
            JARVIS_SYSTEM_PROMPT,
            currentDateLine(now()),
            widgetLayoutNotice(widgets),
            resultsOnScreenNotice(results),
            await loadBrowseNotice(),
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
              browseTools.tools,
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

        return {
          sessionId: savedIn,
          text: reply,
          memoryEvents,
          ...resultsForReply(widgetTools.changes(), searchTools.outcome()),
        }
      } finally {
        await pluginTools.close()
      }
    },
  }
}

export type Turns = ReturnType<typeof createTurns>
