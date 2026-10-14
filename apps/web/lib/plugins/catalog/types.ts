/** One Plugin in the Marketplace, reached through Composio (ADR 0005). */
export type PluginEntry = {
  id: string
  name: string
  /** Public path to the Plugin's icon. */
  icon: string
  /** The Composio toolkit that holds the Owner's authorization. */
  toolkit: string
  /** Only these Composio tools are ever offered to Jarvis. */
  toolAllowlist: string[]
}
