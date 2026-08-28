import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Native and wasm backed decoders must stay outside the server bundle so
  // their binaries and worker files resolve at runtime.
  serverExternalPackages: ["@napi-rs/canvas", "heic-convert", "pdfjs-dist", "sharp"],
};

export default nextConfig;
