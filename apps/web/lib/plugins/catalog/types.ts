/** An OAuth 2.0 provider shared by every Plugin that authorizes against it. */
export type OAuthProvider = {
  id: string
  /** Env vars holding this provider's OAuth client credentials. */
  clientIdEnv: string
  clientSecretEnv: string
  authorizationUrl: string
  tokenUrl: string
  /** Absent when the provider has no revocation endpoint. */
  revocationUrl?: string
  /** Extra query params for the consent URL, e.g. to get a refresh token. */
  authorizationParams?: Record<string, string>
}

/** One Plugin in the Marketplace, with its single Connector. */
export type PluginEntry = {
  id: string
  name: string
  /** Public path to the Plugin's icon. */
  icon: string
  connector: {
    /** Remote MCP server (Streamable HTTP), per ADR 0001. */
    mcpUrl: string
    oauth: { provider: OAuthProvider; scopes: string[] }
    /** Only these MCP tools are ever offered to Jarvis. */
    toolAllowlist: string[]
  }
}
