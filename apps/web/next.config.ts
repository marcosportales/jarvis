import path from "node:path"

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  // No dev badge in the corner, where it would show in the Floating Orb.
  devIndicators: false,
  // The Jarvis App runs this standalone server inside itself (ADR 0009).
  output: "standalone",
  // Traced from the monorepo root, so workspace packages are included.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  outputFileTracingIncludes: {
    // Read at runtime relative to the server's working directory.
    "/*": ["./lib/db/migrations/**/*"],
  },
}

export default nextConfig
