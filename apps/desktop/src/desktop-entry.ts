/**
 * Jarvis's desktop entry, `<app id>.desktop`. The desktop portal only
 * registers Jarvis's app id when it finds that file, so Push-to-talk from any
 * app needs it; the Jarvis App writes one where none is installed yet.
 */

/**
 * A desktop entry launching Jarvis with `command`: the executable, then its
 * arguments (in dev mode, Electron and the app's directory).
 */
export function desktopEntry(command: string[]): string {
  const exec = command.map(quoteExecArgument).join(" ")
  return [
    "[Desktop Entry]",
    "Name=Jarvis",
    "Comment=Jarvis, tu asistente de voz",
    `Exec=${exec} %U`,
    "Icon=jarvis",
    "Terminal=false",
    "Type=Application",
    "Categories=Utility;",
    "StartupWMClass=Jarvis",
    "Actions=Quit;",
    "",
    "[Desktop Action Quit]",
    "Name=Salir de Jarvis",
    `Exec=${exec} --quit`,
    "",
  ].join("\n")
}

/**
 * Quotes an `Exec` argument as the Desktop Entry spec asks, when it has a
 * reserved character; `%` is doubled either way.
 */
function quoteExecArgument(argument: string): string {
  const escaped = argument.replaceAll("%", "%%")
  if (!/[\s"'\\><~|&;$*?#()`]/.test(escaped)) return escaped
  // Inside quotes, `"`, `` ` ``, `$` and `\` are backslash-escaped; the
  // backslashes are doubled again by the string escaping of the value.
  const quoted = escaped.replace(/["`$\\]/g, "\\$&").replaceAll("\\", "\\\\")
  return `"${quoted}"`
}
