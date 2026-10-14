import { Jarvis } from "@/components/jarvis"
import { SessionGone } from "@/components/session-gone"
import { WidgetLayer } from "@/components/widgets/widget-layer"
import { getSessions } from "@/lib/sessions/server"

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const turns = await getSessions().transcript(id)
  return (
    <>
      {turns ? (
        <Jarvis key={id} saved={{ sessionId: id, turns }} />
      ) : (
        <SessionGone />
      )}
      <WidgetLayer />
    </>
  )
}
