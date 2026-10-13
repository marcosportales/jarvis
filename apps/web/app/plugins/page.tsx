import type { Metadata } from "next"
import Link from "next/link"
import { connection } from "next/server"

import { Button } from "@workspace/ui/components/button"

import type { MarketplaceItem, PluginState } from "@/lib/plugins/plugins"
import { getPlugins } from "@/lib/plugins/server"

import { installPlugin } from "./actions"

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
    `${name} no está configurado: faltan sus credenciales OAuth.`,
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
  // The Marketplace reads local SQLite synchronously; keep it out of prerendering.
  await connection()
  const items = await getPlugins().listMarketplace()
  const message = messageFor(await searchParams, items)

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-4 pt-10">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Plugins</h1>
          <p className="text-sm text-muted-foreground">
            Servicios a los que Jarvis puede acceder.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Volver a Jarvis
        </Link>
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

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <PluginCard key={item.id} item={item} />
        ))}
      </ul>
    </main>
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
  if (item.state === "installable" || item.state === "reconnect") {
    return (
      <form action={installPlugin}>
        <input type="hidden" name="pluginId" value={item.id} />
        <Button type="submit">
          {item.state === "reconnect" ? "Reconectar" : "Instalar"}
        </Button>
      </form>
    )
  }
  return null
}
