// Copies what voice detection loads at runtime into public/vad/, so the
// Jarvis page serves it itself: Silero VAD v6 and vad-web's worklet, and
// ONNX Runtime's wasm, which runs the model. Run before dev and build.
import { copyFileSync, mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

const require = createRequire(import.meta.url)
const vadWeb = path.dirname(require.resolve("@ricky0123/vad-web"))
// onnxruntime-web is vad-web's dependency, so it resolves from there.
const ortWeb = path.dirname(
  createRequire(path.join(vadWeb, "index.js")).resolve("onnxruntime-web/wasm")
)
const target = path.join(import.meta.dirname, "../public/vad")

mkdirSync(target, { recursive: true })
for (const [from, file] of [
  [vadWeb, "silero_vad_v6.onnx"],
  [vadWeb, "vad.worklet.bundle.min.js"],
  [ortWeb, "ort-wasm-simd-threaded.mjs"],
  [ortWeb, "ort-wasm-simd-threaded.wasm"],
]) {
  copyFileSync(path.join(from, file), path.join(target, file))
}
