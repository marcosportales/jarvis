import { nextJsConfig } from "@workspace/eslint-config/next-js"

/** @type {import("eslint").Linter.Config} */
export default [
  // Third-party files copied there by scripts/copy-vad-assets.mjs.
  { ignores: ["public/vad/**"] },
  ...nextJsConfig,
]
