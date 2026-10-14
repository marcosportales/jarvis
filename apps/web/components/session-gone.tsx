import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"

/** Shown for a Session link whose Session was deleted (or never existed). */
export function SessionGone() {
  return (
    <Empty className="h-svh">
      <EmptyHeader>
        <EmptyTitle>Esta sesión ya no existe</EmptyTitle>
        <EmptyDescription>
          Puede que la hayas eliminado. Empieza una nueva para seguir hablando
          con Jarvis.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button nativeButton={false} render={<Link href="/" />}>
          Nueva sesión
        </Button>
      </EmptyContent>
    </Empty>
  )
}
