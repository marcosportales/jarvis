"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { callbackUrl, getPlugins } from "@/lib/plugins/server"

async function requestOrigin() {
  const headerList = await headers()
  const host = headerList.get("host")
  const protocol = headerList.get("x-forwarded-proto") ?? "http"
  return `${protocol}://${host}`
}

/** Install and Reconnect: both send the Owner through Composio's consent flow. */
export async function installPlugin(formData: FormData) {
  const pluginId = String(formData.get("pluginId"))
  const begun = await getPlugins().beginInstall(pluginId, {
    callbackUrl: callbackUrl(await requestOrigin()),
  })
  if (!begun.ok) {
    redirect(
      `/plugins?plugin=${encodeURIComponent(pluginId)}&error=${begun.reason}`
    )
  }
  // The Plugins module remembers this Install by its state, so the consent
  // screen may finish in any browser (the Jarvis App opens the Owner's own).
  redirect(begun.authorizationUrl)
}

export async function uninstallPlugin(formData: FormData) {
  const pluginId = String(formData.get("pluginId"))
  // redirect() throws, so it can't run inside the try.
  let failed = false
  try {
    await getPlugins().uninstall(pluginId)
  } catch (error) {
    console.error(`Uninstall of ${pluginId} failed`, error)
    failed = true
  }
  if (failed) {
    redirect(
      `/plugins?plugin=${encodeURIComponent(pluginId)}&error=uninstall-failed`
    )
  }
  redirect(`/plugins?plugin=${encodeURIComponent(pluginId)}&uninstalled=1`)
}
