import type { Metadata } from "next"
import { connection } from "next/server"

import { Button } from "@workspace/ui/components/button"

import type { MarketplaceItem, PluginState } from "@/lib/plugins/plugins"
import { getPlugins } from "@/lib/plugins/server"

import { installPlugin, uninstallPlugin } from "./actions"

export const metadata: Metadata = {
  title: "Plugins · Jarvis",
}

const STATE_LABELS: Record<PluginState, string> = {
  "not-configured": "No configurado",
  installable: "Disponible",
  connected: "Conectado",
  reconnect: "Desconectado",
}

const ERROR_MESSAGES: Record<string, (name: string) => string> = {
  cancelled: (name) => `Cancelaste la autorización; ${name} no se instaló.`,
  "invalid-state": (name) =>
    `La autorización de ${name} no es válida o caducó. Vuelve a intentarlo.`,
  failed: (name) => `No se pudo conectar ${name}. Vuelve a intentarlo.`,
  "not-configured": (name) =>
    `${name} no está configurado: falta COMPOSIO_API_KEY.`,
  "uninstall-failed": (name) =>
    `No se pudo desinstalar ${name}. Vuelve a intentarlo.`,
  "unknown-plugin": () => "Ese Plugin no está en el Marketplace.",
}

function messageFor(
  params: Record<string, string | string[] | undefined>,
  items: MarketplaceItem[]
) {
  const name =
    items.find((item) => item.id === params.plugin)?.name ?? "El Plugin"
  if (params.installed) {
    return { tone: "success" as const, text: `${name} está conectado.` }
  }
  if (params.uninstalled) {
    return {
      tone: "success" as const,
      text: `${name} se desinstaló; Jarvis ya no tiene acceso.`,
    }
  }
  if (typeof params.error === "string") {
    const describe = ERROR_MESSAGES[params.error] ?? ERROR_MESSAGES.failed!
    return { tone: "error" as const, text: describe(name) }
  }
  return undefined
}

export default async function PluginsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // The Marketplace is read from Composio on every visit.
  await connection()
  let items: MarketplaceItem[] | undefined
  try {
    items = await getPlugins().listMarketplace()
  } catch (error) {
    console.error("Listing the Marketplace failed", error)
  }
  const message = messageFor(await searchParams, items ?? [])

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-4 pt-10">
      <header>
        <h1 className="text-xl font-semibold">Plugins</h1>
        <p className="text-sm text-muted-foreground">
          Servicios a los que Jarvis puede acceder.
        </p>
      </header>

      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={
            message.tone === "error"
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {message.text}
        </p>
      )}

      {items ? (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <PluginCard key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          No se pudo contactar con Composio. Vuelve a intentarlo en un momento.
        </p>
      )}
    </div>
  )
}

function PluginCard({ item }: { item: MarketplaceItem }) {
  return (
    <li className="flex items-center gap-4 rounded-xl border p-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny local SVG */}
      <img src={item.icon} alt="" className="size-10" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{item.name}</span>
        <span className="text-sm text-muted-foreground">
          {STATE_LABELS[item.state]}
        </span>
      </div>
      <PluginActions item={item} />
    </li>
  )
}

function PluginActions({ item }: { item: MarketplaceItem }) {
  const canInstall = item.state === "installable" || item.state === "reconnect"
  const canUninstall = item.state === "connected" || item.state === "reconnect"
  return (
    <div className="flex gap-2">
      {canUninstall && (
        <form action={uninstallPlugin}>
          <input type="hidden" name="pluginId" value={item.id} />
          <Button type="submit" variant="outline">
            Desinstalar
          </Button>
        </form>
      )}
      {canInstall && (
        <form action={installPlugin}>
          <input type="hidden" name="pluginId" value={item.id} />
          <Button type="submit">
            {item.state === "reconnect" ? "Reconectar" : "Instalar"}
          </Button>
        </form>
      )}
    </div>
  )
}
