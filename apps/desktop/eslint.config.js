import { config } from "@workspace/eslint-config/base"
import globals from "globals"

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    // The staged server and the packaged app are build output.
    ignores: [".stage/**", "release/**"],
  },
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // The shared config doesn't pick up TypeScript files on its own. Its
    // parser doesn't see TypeScript's scopes, so tsc checks names instead.
    files: ["**/*.ts", "**/*.cts"],
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },
]
