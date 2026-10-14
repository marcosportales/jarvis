import { gmail } from "./gmail"
import type { PluginEntry } from "./types"

export type { PluginEntry } from "./types"

/** The Marketplace: a fixed catalog, one file per Plugin. */
export const marketplace: PluginEntry[] = [gmail]
