import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/plugins/db/schema.ts",
  out: "./lib/plugins/db/migrations",
})
