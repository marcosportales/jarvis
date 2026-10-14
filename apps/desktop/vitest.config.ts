import { defineConfig } from "vitest/config"

export default defineConfig({
  // The preload script is CommonJS TypeScript (`.cts`), which Vite doesn't
  // transform by default.
  oxc: { include: /\.(m?ts|cts|[jt]sx)$/ },
})
