import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack from trying to bundle @xenova/transformers and its
  // ONNX/WASM internals — let Node.js require() it at runtime instead.
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node"],
};

export default nextConfig;
