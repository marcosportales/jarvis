"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  CALLBACK_PATH,
  callbackUrl,
  getPlugins,
  PENDING_INSTALL_COOKIE,
} from "@/lib/plugins/server"

async function requestOrigin() {
  const headerList = await headers()
  const host = headerList.get("host")
  const protocol = headerList.get("x-forwarded-proto") ?? "http"
  return `${protocol}://${host}`
}

/** Install and Reconnect: both send the Owner through OAuth. */
export async function installPlugin(formData: FormData) {
  const pluginId = String(formData.get("pluginId"))
  const begun = await getPlugins().beginInstall(pluginId, {
    redirectUri: callbackUrl(await requestOrigin()),
  })
  if (!begun.ok) {
    redirect(
      `/plugins?plugin=${encodeURIComponent(pluginId)}&error=${begun.reason}`
    )
  }

  const cookieStore = await cookies()
  cookieStore.set(PENDING_INSTALL_COOKIE, JSON.stringify(begun.pending), {
    httpOnly: true,
    sameSite: "lax",
    path: CALLBACK_PATH,
    maxAge: 10 * 60,
  })
  redirect(begun.authorizationUrl)
}

export async function uninstallPlugin(formData: FormData) {
  const pluginId = String(formData.get("pluginId"))
  await getPlugins().uninstall(pluginId)
  redirect(`/plugins?plugin=${encodeURIComponent(pluginId)}&uninstalled=1`)
}
