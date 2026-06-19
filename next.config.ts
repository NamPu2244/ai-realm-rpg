import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack from trying to bundle @xenova/transformers and its
  // ONNX/WASM internals — let Node.js require() it at runtime instead.
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' https://image.pollinations.ai data: blob:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
