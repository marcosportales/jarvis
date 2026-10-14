import "server-only"

import { getBrowse } from "../browse/server"
import { getHealth } from "../health/server"
import { getMachine } from "../machine/server"
import { nan, nanConfig } from "../jarvis/server/nan"
import { getMemories } from "../memory/server"
import { getPlugins } from "../plugins/server"
import { getSearch } from "../search/server"
import { getSessions } from "../sessions/server"
import { getWeather } from "../weather/server"
import { createTurns, type Turns } from "./turn"

/** The Turn module wired to the configured chat model and the real stores. */
export function getTurns(): Turns {
  return createTurns({
    model: nan.chat(nanConfig.chatModel),
    sessions: getSessions(),
    memories: getMemories(),
    plugins: getPlugins(),
    weather: getWeather(),
    search: getSearch(),
    browse: getBrowse(),
    machine: getMachine(),
    health: getHealth(),
    now: () => new Date(),
  })
}
