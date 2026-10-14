import type { HealthReport } from "../health/health"
import type { MachineReading } from "../machine/machine"

/** What `GET /api/system` answers the System Widget. */
export type SystemSnapshot = {
  /** Null when the computer couldn't be read. */
  machine: MachineReading | null
  health: HealthReport
}

const GIB = 1024 ** 3

const percentFormat = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 0,
})

const gigabyteFormat = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** "37 %", as Spanish writes it. */
export function formatPercent(percent: number) {
  return `${percentFormat.format(percent)} %`
}

/** "11,2 de 15,3 GB", one decimal with a decimal comma. */
export function formatMemory({
  usedBytes,
  totalBytes,
}: MachineReading["memory"]) {
  return `${gigabyteFormat.format(usedBytes / GIB)} de ${gigabyteFormat.format(totalBytes / GIB)} GB`
}
