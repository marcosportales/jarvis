import type { Metadata } from "next"
import Link from "next/link"
import { connection } from "next/server"

import type { MarketplaceItem, PluginState } from "@/lib/plugins/plugins"
import { getPlugins } from "@/lib/plugins/server"

export const metadata: Metadata = {
  title: "Plugins · Jarvis",
}

const STATE_LABELS: Record<PluginState, string> = {
  "not-configured": "No configurado",
  installable: "Disponible",
  connected: "Conectado",
  reconnect: "Desconectado",
}

export default async function PluginsPage() {
  // The Marketplace reads local SQLite synchronously; keep it out of prerendering.
  await connection()
  const items = await getPlugins().listMarketplace()

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
    </li>
  )
}
