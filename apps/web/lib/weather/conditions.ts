/**
 * The one table from WMO weather codes to Spanish text and an icon, shared by
 * the Weather Widget and Jarvis. Icons are lucide icon names.
 */
export type WeatherIcon =
  | "sun"
  | "cloud-sun"
  | "cloud"
  | "cloud-fog"
  | "cloud-drizzle"
  | "cloud-rain"
  | "cloud-snow"
  | "cloud-lightning"

export type WeatherCondition = {
  code: number
  text: string
  icon: WeatherIcon
}

const CONDITIONS: Record<number, [string, WeatherIcon]> = {
  0: ["Despejado", "sun"],
  1: ["Mayormente despejado", "cloud-sun"],
  2: ["Parcialmente nublado", "cloud-sun"],
  3: ["Nublado", "cloud"],
  45: ["Niebla", "cloud-fog"],
  48: ["Niebla con escarcha", "cloud-fog"],
  51: ["Llovizna", "cloud-drizzle"],
  53: ["Llovizna", "cloud-drizzle"],
  55: ["Llovizna intensa", "cloud-drizzle"],
  56: ["Llovizna helada", "cloud-drizzle"],
  57: ["Llovizna helada", "cloud-drizzle"],
  61: ["Lluvia débil", "cloud-rain"],
  63: ["Lluvia", "cloud-rain"],
  65: ["Lluvia intensa", "cloud-rain"],
  66: ["Lluvia helada", "cloud-rain"],
  67: ["Lluvia helada", "cloud-rain"],
  71: ["Nieve débil", "cloud-snow"],
  73: ["Nieve", "cloud-snow"],
  75: ["Nieve intensa", "cloud-snow"],
  77: ["Granizo fino", "cloud-snow"],
  80: ["Chubascos débiles", "cloud-rain"],
  81: ["Chubascos", "cloud-rain"],
  82: ["Chubascos fuertes", "cloud-rain"],
  85: ["Chubascos de nieve", "cloud-snow"],
  86: ["Chubascos de nieve", "cloud-snow"],
  95: ["Tormenta", "cloud-lightning"],
  96: ["Tormenta con granizo", "cloud-lightning"],
  99: ["Tormenta con granizo", "cloud-lightning"],
}

export function weatherCondition(code: number): WeatherCondition {
  const [text, icon] = CONDITIONS[code] ?? ["Desconocido", "cloud"]
  return { code, text, icon }
}
